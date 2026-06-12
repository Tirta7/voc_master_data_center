/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, ChevronRight, Wallet, Timer, CheckCircle2, 
    QrCode, Receipt as ReceiptIcon, Receipt, Calculator, 
    Coffee, Check, ShieldCheck, Zap, Printer, CreditCard,
    Coins, Monitor, Minus, MousePointer2, Sparkles, Activity, X
} from 'lucide-react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import PaymentConfirmationModal from '@/components/billing/PaymentConfirmationModal';
import SplitBillDashboard from '@/components/billing/SplitBillDashboard';
import MergeModal from '@/components/billing/MergeModal';
import { useAuth } from '@/context/AuthContext';
import ThermalReceipt from '@/components/ThermalReceipt';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
import { generateIdempotencyKey } from '@/utils/transactionUtils';


function BillingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { user, terminalId } = useAuth();
    const { publish, isConnected } = useMqtt();
    const tableId = searchParams.get('tableId');
    const tableType = searchParams.get('type');
    const transactionId = searchParams.get('transactionId');
    
    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [settings, setSettings] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);

    // Voucher States
    const [voucherCodeInput, setVoucherCodeInput] = useState('');
    const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
    const [lastPaymentInfo, setLastPaymentInfo] = useState<{total: number, method: string, payAmount: number, change: number} | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await axios.get(`/settings`);
            setSettings(response.data);
            if (response.data?.availablePaymentMethods?.length > 0) {
                setPaymentMethod(response.data.availablePaymentMethods[0].toUpperCase());
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, []);

    const fetchTransaction = useCallback(async () => {
        try {
            const knownTxId = transactionId || transaction?.id;
            const url = knownTxId
                ? `/transactions/${knownTxId}`
                : `/transactions/table/${tableId}${tableType ? `?type=${tableType}` : ''}`;
            const response = await axios.get(url);
            setTransaction(response.data);
            const rem = Math.max(0, Number(response.data.grandTotal || 0) - Number(response.data.paidAmount || 0));
            setPaymentAmount(rem <= 1 ? '0' : Math.round(rem).toString());
        } catch (error) {
            console.error('Failed to fetch transaction:', error);
            showAlert('Data Tidak Ditemukan', 'Tidak ada billing aktif.', { variant: 'error' });
            router.push(tableType === 'cafe' ? '/cafe' : '/');
        } finally {
            setLoading(false);
        }
    }, [transactionId, tableId, transaction?.id, router, showAlert]);

    useEffect(() => {
        if (tableId || transactionId) {
            fetchTransaction();
            fetchSettings();
        }
    }, [tableId, transactionId, fetchTransaction, fetchSettings]);

    const selectedItemsParam = searchParams.get('selectedItems');
    useEffect(() => {
        if (selectedItemsParam) {
            const ids = selectedItemsParam.split(',').map(Number).filter(n => !isNaN(n));
            if (ids.length > 0) {
                setSelectedItems(ids);
                setIsSplitBillOpen(true);
            }
        }
    }, [selectedItemsParam]);

    // REAL-TIME CFD SYNC (MQTT & SOCKET)
    useEffect(() => {
        if (transaction) {
            const currentTableId = tableId || transaction.tableId || transaction.table?.id || transaction.cafeTable?.id;
            const rem = Math.max(0, Number(transaction.grandTotal || 0) - Number(transaction.paidAmount || 0));
            const changeAmt = Math.max(0, Number(paymentAmount || 0) - rem);
            const topic = currentTableId ? `cfd/table/${currentTableId}` : `cfd/tx/${transaction.id}`;
            const payload = {
                tableId: currentTableId ? Number(currentTableId) : null,
                transactionId: transaction.id,
                tableName: transaction.table?.tableName || transaction.cafeTable?.tableName || 'Order Cabinet',
                grandTotal: Number(transaction.grandTotal),
                paidAmount: Number(transaction.paidAmount),
                remaining: rem,
                paymentAmount: Number(paymentAmount || 0),
                paymentMethod: paymentMethod,
                change: changeAmt,
                changeAmount: changeAmt, 
                customerName: transaction.customerName || (transaction.member ? transaction.member.name : ''),
                status: 'BILLING_IN_PROGRESS',
                terminalId: terminalId, // Route specifically to terminal display if linked
                lastUpdate: new Date().toISOString()
            };
            
            // Sync via MQTT
            publish(topic, payload);
            
            // Sync via Socket.io for CFD Display
            socket.emit('billing_payment_state', payload);
        }
    }, [transaction, paymentAmount, paymentMethod, publish, tableId, terminalId]);

    const getRemainingBalance = useCallback(() => {
        if (!transaction) return 0;
        const rem = Math.max(0, Number(transaction.grandTotal || 0) - Number(transaction.paidAmount || 0));
        return rem <= 1 ? 0 : rem;
    }, [transaction]);

    const getOriginalGrandTotalBeforeVoucher = useCallback(() => {
        if (!transaction) return 0;
        const vchDisc = Number(transaction.voucherDiscountAmount || 0);
        const currentGrandTotal = Number(transaction.sessionTotals?.grandTotal || transaction.sessionTotals?.total || transaction.grandTotal || 0);
        if (!transaction.voucherCode || vchDisc <= 0) {
            return currentGrandTotal;
        }
        
        // Recalculate what the grand total would be if vchDisc was 0
        const actualSubtotal = (Number(transaction.sessionTotals?.billiardTotal) || Number(transaction.billiardTotal) || 0) + 
                               (Number(transaction.sessionTotals?.cafeTotal) || Number(transaction.cafeTotal) || 0);
        const totalDiscountVal = Number(transaction.sessionTotals?.discountAmount || transaction.discountAmount || 0);
        
        const originalDiscVal = Math.max(0, totalDiscountVal - vchDisc);
        const originalDiscountedSubtotal = Math.max(0, actualSubtotal - originalDiscVal);
        
        const scPercent = Number(settings?.serviceChargePercentage || 0) / 100;
        const vatPercent = Number(settings?.ppnPercentage || 0) / 100;
        
        const originalScAmount = Math.round(originalDiscountedSubtotal * scPercent);
        const originalTaxAmount = Math.round((originalDiscountedSubtotal + originalScAmount) * vatPercent);
        const originalRawTotal = originalDiscountedSubtotal + originalScAmount + originalTaxAmount;
        const originalKelipatan = Math.max(1, Number(settings?.roundingKelipatan || 1));
        return Math.ceil(originalRawTotal / originalKelipatan) * originalKelipatan;
    }, [transaction, settings]);


    const groupedItems = React.useMemo(() => {
        if (!transaction?.orderItems) return [];
        const groups: Record<string, any> = {};
        transaction.orderItems.forEach((item: any) => {
            if (item.status === 'CANCELLED' || item.status === 'VOID') return;
            const key = `${item.menuItemId || item.menuItem?.id}-${item.priceAtOrder}-${item.customName || ''}`;
            if (groups[key]) {
                groups[key].quantity += Number(item.quantity);
            } else {
                groups[key] = { ...item, quantity: Number(item.quantity) };
            }
        });
        return Object.values(groups);
    }, [transaction?.orderItems]);

    const handleApplyVoucher = async () => {
        if (!voucherCodeInput.trim() || !transaction?.id) return;
        setIsApplyingVoucher(true);
        try {
            await axios.post(`/transactions/${transaction.id}/voucher/apply`, { code: voucherCodeInput });
            showAlert('Sukses', 'Voucher berhasil diterapkan.', { variant: 'success' });
            fetchTransaction();
        } catch (error: any) {
            const errorMsg = error.response?.data?.message;
            const finalMsg = Array.isArray(errorMsg) ? errorMsg.join('\n') : (errorMsg || 'Voucher tidak valid atau tidak memenuhi syarat.');
            showAlert('Gagal', finalMsg, { variant: 'error' });
        } finally {
            setIsApplyingVoucher(false);
            setVoucherCodeInput('');
        }
    };

    const handleRemoveVoucher = async () => {
        if (!transaction?.id) return;
        try {
            await axios.post(`/transactions/${transaction.id}/voucher/remove`);
            showAlert('Sukses', 'Voucher dilepas.', { variant: 'success' });
            fetchTransaction();
        } catch (error: any) {
            showAlert('Gagal', 'Gagal melepas voucher.', { variant: 'error' });
        }
    };

    const remainingBalance = getRemainingBalance();
    const processingPaymentRef = useRef(false);

    const processPayment = async () => {
        if (processingPaymentRef.current || isSubmitting) return;
        processingPaymentRef.current = true;
        setIsSubmitting(true);
        try {
            const currentChange = Math.max(0, Number(paymentAmount || 0) - remainingBalance);
            setLastPaymentInfo({
                total: remainingBalance,
                method: paymentMethod || 'CASH',
                payAmount: Number(paymentAmount || 0),
                change: currentChange
            });
            const idempotencyKey = generateIdempotencyKey('payment', user?.id);
            
            const res = await axios.post(`/transactions/${transaction.id}/pay`, {
                amount: Number(paymentAmount),
                method: (paymentMethod || 'CASH').toUpperCase(),
                userId: user?.id,
                idempotencyKey
            });
            
            // Perbarui state transaction dengan data terbaru dari respons pembayaran
            if (res.data && res.data.id) {
                setTransaction(res.data);
            } else {
                await fetchTransaction();
            }
            
            processingPaymentRef.current = false;
            setIsSubmitting(false);
            // Jangan langsung navigate — biarkan kasir cetak struk dulu
            setIsPaymentSuccess(true);
        } catch (error) {
            processingPaymentRef.current = false;
            setIsSubmitting(false);
            showAlert('Gagal', 'Pembayaran gagal.', { variant: 'error' });
        }
    };

    const handlePaymentDone = async () => {
        if (processingPaymentRef.current || isSubmitting) return;
        processingPaymentRef.current = true;
        setIsSubmitting(true);
        // ✅ v18.10: Backend now handles table release safely when called with amount=0
        // on an already-PAID transaction (no duplicate event emitted). No need to call /pay here.
        setIsConfirmModalOpen(false);
        setIsPaymentSuccess(false);
        setLastPaymentInfo(null);
        processingPaymentRef.current = false;
        setIsSubmitting(false);
        router.push(tableType === 'cafe' ? '/cafe' : '/');
    };

    // Keyboard Shortcuts (Enter to confirm, Esc to go back)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const canPay = !isSubmitting && paymentMethod && Number(paymentAmount) >= remainingBalance;
                if (canPay && !isConfirmModalOpen) {
                    if (remainingBalance === 0) {
                        if (transaction.status === 'PAID' || transaction.status === 'COMPLETED') {
                            handlePaymentDone();
                        } else {
                            processPayment();
                        }
                    } else {
                        setIsConfirmModalOpen(true);
                    }
                } else if (isConfirmModalOpen) {
                    processPayment();
                }
            } else if (e.key === 'Escape') {
                if (isConfirmModalOpen) setIsConfirmModalOpen(false);
                else if (isSplitBillOpen) setIsSplitBillOpen(false);
                else if (isMergeModalOpen) setIsMergeModalOpen(false);
                else router.push(tableType === 'cafe' ? '/cafe' : '/');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitting, paymentMethod, paymentAmount, remainingBalance, isConfirmModalOpen, isSplitBillOpen, router, tableType, processPayment]);

    const transactionRef = useRef<any>(null);
    useEffect(() => { 
        transactionRef.current = transaction; 
        if (transaction && (tableId || transactionId)) {
            socket.emit('billing_view_focus', { 
                tableId: Number(tableId || transaction.tableId), 
                type: tableType || (transaction.cafeTable ? 'cafe' : 'billiard'),
                transactionId: transaction.id,
                terminalId: terminalId
            });
        }
        return () => { socket.emit('billing_view_focus', { terminalId: terminalId }); };
    }, [transaction, tableId, transactionId, tableType, terminalId]);

    const handleMergePrompt = async () => {
        setIsMergeModalOpen(true);
    };

    const handleConfirmMerge = async (targetTableId: number) => {
        setIsMergeModalOpen(false);
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.post(`/transactions/merge`, {
                sourceTableId: Number(tableId),
                targetTableId: Number(targetTableId),
                type: tableType || 'billiard',
                userId: user?.id,
                idempotencyKey: generateIdempotencyKey('merge', user?.id)
            });
            setIsSubmitting(false);
            showAlert('Berhasil', 'Billing digabung!', { variant: 'success' });
            router.push(tableType === 'cafe' ? '/cafe' : '/');
        } catch (error) {
            setIsSubmitting(false);
            showAlert('Gagal', 'Gagal menggabung meja.', { variant: 'error' });
        }
    };

    const handleHoldBill = async () => {
        const isConfirmed = await showConfirm('Simpan Billing', 'Simpan transaksi ini sebagai piutang / bon?', { confirmLabel: 'Simpan' });
        if (isConfirmed) {
            let customerName = transaction.customerName || '';
            let customerPhone = transaction.customerPhone || '';

            if (!transaction.member && !customerName) {
                customerName = window.prompt('Masukkan Nama Pelanggan:', '') || '';
            }
            
            customerPhone = window.prompt('Masukkan Nomor WhatsApp (Opsional):', customerPhone) || '';

            setIsSubmitting(true);
            try {
                await axios.post(`/transactions/${transaction.id}/hold`, { 
                    userId: user?.id, 
                    idempotencyKey: generateIdempotencyKey('hold', user?.id),
                    customerName,
                    customerPhone
                });
                
                setIsSubmitting(false);
                showAlert('Berhasil', 'Billing telah disimpan sebagai piutang.', { variant: 'success' });
                router.push('/admin/finance/debts');
            } catch (error) {
                setIsSubmitting(false);
                showAlert('Gagal', 'Gagal menyimpan billing.', { variant: 'error' });
            }
        }
    };

    const handlePrint = () => { window.print(); };

    if (loading || !transaction) return null;

    // Fix for Subtotal if showing 0
    const displaySubtotal = Number(transaction.subtotal) || (Number(transaction.grandTotal) - Number(transaction.vatAmount || 0) - Number(transaction.serviceChargeAmount || 0) + Number(transaction.discountAmount || 0));

    return (
        <>
        <div className="h-[100dvh] bg-[#F0F4F8] flex flex-col font-sans text-slate-900 overflow-hidden print:hidden selection:bg-indigo-100 italic-none">
            <header className="min-h-[4rem] pt-[env(safe-area-inset-top)] bg-white/90 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-8 lg:px-12 flex items-center justify-between z-50 flex-shrink-0 sticky top-0 shadow-sm shadow-slate-200/20">
                <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
                    <button 
                        onClick={() => router.push(tableType === 'cafe' ? '/cafe' : '/')} 
                        className="group flex items-center justify-center w-10 h-10 -ml-2 bg-transparent rounded-full hover:bg-slate-100 transition-all active:scale-90"
                    >
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 group-hover:text-indigo-600 transition-colors" />
                    </button>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-indigo-500 opacity-60" />
                            <h1 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Terminal v2.6</h1>
                        </div>
                        <p className="text-sm sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                            {transaction.table?.tableName || transaction.cafeTable?.tableName || 'Order Cabinet'} 
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <span className="text-indigo-600 font-bold opacity-90 text-[10px] sm:text-xs bg-indigo-50 px-2 py-0.5 rounded-md">{terminalId}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className={`group flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border transition-all duration-500 overflow-hidden relative cursor-default ${isConnected ? 'bg-white border-slate-200/50 shadow-sm' : 'bg-rose-50 border-rose-100'}`}>
                        {isConnected && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent"></div>}
                        <div className="relative flex items-center gap-1.5 sm:gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full relative ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}>
                                {isConnected && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40"></div>}
                            </div>
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isConnected ? 'text-slate-500' : 'text-rose-600'}`}>
                                <span className="inline sm:hidden">{isConnected ? 'Sync' : 'Offline'}</span>
                                <span className="hidden sm:inline">{isConnected ? 'Display Synchronized' : 'Display Offline'}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </header>            <main className="flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden block lg:grid lg:grid-cols-12 bg-gradient-to-br from-slate-50 via-[#F0F4F8] to-slate-100">
                {/* 02. LEFT PANEL: ORDER DETAILS & SUMMARY */}
                <section className="col-span-12 lg:col-span-7 flex flex-col relative h-auto lg:h-full min-h-0 lg:min-h-0 flex-shrink-0">
                    <div className="lg:flex-1 lg:overflow-y-auto p-3 pb-24 lg:pb-8 sm:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-8">
                            
                            {/* 02a. SESSION CARD: DEEP GLASS */}
                            {Number(transaction.billiardTotal) > 0 && (
                                <div className="group relative overflow-hidden bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-3 sm:p-8 text-white shadow-2xl shadow-indigo-900/20 flex justify-between items-center gap-3 sm:gap-6 transition-all hover:scale-[1.005]">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-white/5 opacity-50"></div>
                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                                    
                                    <div className="flex items-center gap-3 sm:gap-6 relative z-10 flex-1 min-w-0">
                                        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner flex-shrink-0">
                                            <Timer className="w-4 h-4 sm:w-7 sm:h-7 text-indigo-300" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5 sm:mb-1.5 opacity-80">Active Service</p>
                                            <h3 className="text-[11px] sm:text-xl font-black tracking-tight leading-tight uppercase">
                                                {transaction.fareName || 'Standard'}
                                                <span className="mx-1.5 sm:mx-3 opacity-20 font-light">|</span>
                                                <span className="text-indigo-200 text-[11px] sm:text-xl">{transaction.sessionDuration}</span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10 flex-shrink-0">
                                        <p className="text-[8px] sm:text-sm font-bold text-white/40 uppercase tracking-widest mb-0.5 sm:mb-1">Fee</p>
                                        <p className="text-base sm:text-[36px] font-black tracking-tighter tabular-nums leading-none">
                                            <span className="text-[10px] sm:text-sm opacity-40 mr-1">Rp</span>
                                            {Number(transaction.billiardTotal).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 02b. SUMMARY BIAYA — mobile only (ringkas di atas) */}
                            <div className="lg:hidden bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-4 divide-x divide-slate-100">
                                    <div className="p-2 text-center flex flex-col justify-center">
                                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Subtotal</p>
                                        <p className="text-[9px] sm:text-[11px] font-black text-slate-800 tabular-nums leading-tight">Rp {((Number(transaction.billiardTotal)||0)+(Number(transaction.cafeTotal)||0)).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 text-center flex flex-col justify-center bg-rose-50/30">
                                        <p className="text-[7px] sm:text-[8px] font-black text-rose-400 uppercase tracking-wider mb-0.5">Disc</p>
                                        <p className="text-[9px] sm:text-[11px] font-black text-rose-500 tabular-nums leading-tight">-Rp {(Number(transaction.discountAmount ?? transaction.sessionTotals?.discountAmount ?? 0)).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 text-center flex flex-col justify-center">
                                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tax+Svc</p>
                                        <p className="text-[9px] sm:text-[11px] font-black text-slate-800 tabular-nums leading-tight">Rp {((Number(transaction.vatAmount??0))+(Number(transaction.serviceChargeAmount??0))).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 text-center flex flex-col justify-center bg-indigo-50/50">
                                        <p className="text-[7px] sm:text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-0.5">Total Bill</p>
                                        <p className="text-[9px] sm:text-[11px] font-black text-indigo-600 tabular-nums leading-tight">Rp {(Number(transaction.grandTotal??0)).toLocaleString()}</p>
                                    </div>
                                </div>
                                {Number(transaction.paidAmount??0) > 0 && (
                                    <div className="border-t border-slate-100 px-3 py-1.5 flex justify-between items-center bg-emerald-50/40">
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Paid</span>
                                        <span className="text-[11px] font-black text-emerald-600">Rp {Number(transaction.paidAmount??0).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t-2 border-indigo-100 px-3 py-2 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider italic">Tagihan Tersisa</span>
                                    <span className={`text-sm font-black tabular-nums ${remainingBalance > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                                        Rp {remainingBalance.toLocaleString()}
                                        {remainingBalance === 0 && <span className="ml-1.5 text-emerald-500">✓</span>}
                                    </span>
                                </div>
                            </div>

                            {/* 02b. ORDER LIST: SOFT TILES */}
                            <div className="space-y-2 sm:space-y-6">
                                <div className="flex items-center gap-3 sm:gap-5 px-1">
                                    <div className="flex items-center gap-2 sm:gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] sm:tracking-[0.4em]">Item Pesanan</h3>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                                    <span className="text-[8px] font-black text-slate-300 tabular-nums">{groupedItems.length} item</span>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 content-start">
                                    {groupedItems.map((item: any, i: number) => (
                                        <div key={i} className="flex flex-col justify-between p-2.5 sm:p-4 bg-white border border-slate-100 rounded-xl sm:rounded-3xl cursor-default h-full min-h-[90px] shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                                            <div className="flex items-start gap-2 sm:gap-3 min-w-0 w-full mb-2">
                                                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-[11px] sm:text-xs font-black text-indigo-600 flex-shrink-0">
                                                    {Number(item.quantity)}x
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[10px] sm:text-[13px] font-black uppercase text-slate-800 leading-tight line-clamp-2">{(item.customName || item.menuItem?.name)}</h4>
                                                    <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 font-bold">@Rp {Number(item.priceAtOrder).toLocaleString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right w-full mt-auto pt-2 border-t border-slate-50">
                                                <p className="text-[11px] sm:text-sm font-black text-indigo-600 tabular-nums">
                                                    Rp {(item.priceAtOrder * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {groupedItems.length === 0 && (
                                        <div className="py-10 sm:py-20 flex flex-col items-center justify-center bg-white/50 border border-dashed border-slate-200 rounded-2xl sm:rounded-[2.5rem]">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 sm:mb-4 opacity-40">
                                                <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Items Ordered</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 02c. LEFT FOOTER: CRYSTAL SUMMARY — Desktop only */}
                    <div className="hidden lg:block p-8 pb-12 bg-white/20 backdrop-blur-md border-t border-white/40 mt-auto">
                        <div className="max-w-3xl mx-auto">
                            <div className="grid grid-cols-6 gap-6 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                                    <p className="text-sm font-black text-slate-900 tabular-nums">Rp {((Number(transaction.billiardTotal) || Number(transaction.sessionTotals?.billiardTotal) || 0) + (Number(transaction.cafeTotal) || Number(transaction.sessionTotals?.cafeTotal) || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disc</p>
                                    <p className="text-sm font-black text-rose-500 tabular-nums">Rp {(Number(transaction.discountAmount ?? transaction.sessionTotals?.discountAmount ?? 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</p>
                                    <p className="text-sm font-black text-slate-800 tabular-nums">Rp {(Number(transaction.serviceChargeAmount ?? transaction.sessionTotals?.serviceChargeAmount ?? 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax ({settings?.ppnPercentage}%)</p>
                                    <p className="text-sm font-black text-slate-800 tabular-nums">Rp {(Number(transaction.vatAmount ?? transaction.sessionTotals?.vatAmount ?? 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-6">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Bill</p>
                                    <p className="text-sm font-black text-indigo-600 tabular-nums">Rp {(Number(transaction.grandTotal ?? transaction.sessionTotals?.grandTotal ?? transaction.sessionTotals?.total ?? 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                    <p className="text-sm font-black text-emerald-600 tabular-nums">Rp {(Number(transaction.paidAmount) || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-slate-200/50">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] italic">Required Amount</span>
                                    <span className={`text-6xl font-black tracking-tighter leading-none tabular-nums ${remainingBalance > 0 ? 'text-slate-900' : 'text-emerald-500'}`}>
                                        <span className="text-2xl mr-2 opacity-20">Rp</span>
                                        {remainingBalance.toLocaleString()}
                                    </span>
                                </div>
                                {remainingBalance === 0 && (
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Settlement Complete</span>
                                    </div>
                                )}
                                {transaction.voucherCode && Number(transaction.voucherDiscountAmount) > 0 && (
                                    <div className="text-right">
                                        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl max-w-sm ml-auto relative overflow-hidden shadow-sm shadow-emerald-100/50">
                                            <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                                                Voucher <span className="font-black bg-emerald-200/50 px-1.5 py-0.5 rounded uppercase">{transaction.voucherCode}</span> = <span className="font-black text-emerald-600">-Rp {(Number(transaction.voucherDiscountAmount)).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Mobile Proceed to Payment Button */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe">
                        <button 
                            onClick={() => setIsMobileCheckoutOpen(true)}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-between px-6 group"
                        >
                            <span className="flex items-center gap-2"><Wallet className="w-4 h-4 opacity-70" /> Lanjutkan Pembayaran</span>
                            <span className="bg-white/20 px-2 py-1 rounded-lg">Rp {remainingBalance.toLocaleString()}</span>
                        </button>
                    </div>
                </section>

                {/* 03. RIGHT PANEL: GLASS COMMAND HUB (Mobile Popup) */}
                <section className={`
                    col-span-12 lg:col-span-5 flex-col lg:h-full lg:min-h-0 border-t lg:border-t-0 lg:border-l border-white/20 overflow-hidden
                    ${isMobileCheckoutOpen ? 'fixed inset-0 z-[100] bg-slate-900 animate-in slide-in-from-bottom-4 duration-300 flex' : 'hidden lg:flex relative h-auto'}
                `}>
                    {/* Mobile Popup Header */}
                    <div className="lg:hidden flex flex-col px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0 relative z-50 bg-slate-900/50 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <Wallet className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1">Pembayaran</h3>
                                    <p className="text-indigo-300 text-[10px] font-bold tracking-widest">Remaining: Rp {remainingBalance.toLocaleString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsMobileCheckoutOpen(false)}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all border border-white/10"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        {/* Mobile Mini Summary in Checkout */}
                        <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="flex flex-col text-center w-1/4">
                                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Subtotal</span>
                                <span className="text-[9px] font-black text-white">Rp {displaySubtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col text-center w-1/4 border-l border-white/10">
                                <span className="text-[7px] font-black text-rose-400/70 uppercase tracking-widest mb-0.5">Disc</span>
                                <span className="text-[9px] font-black text-rose-400">-Rp {(Number(transaction.discountAmount ?? transaction.sessionTotals?.discountAmount ?? 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col text-center w-1/4 border-l border-white/10">
                                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Tax+Svc</span>
                                <span className="text-[9px] font-black text-white">Rp {((Number(transaction.vatAmount??0))+(Number(transaction.serviceChargeAmount??0))).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col text-center w-1/4 border-l border-white/10 bg-indigo-500/10 rounded-r-lg">
                                <span className="text-[7px] font-black text-indigo-300/70 uppercase tracking-widest mb-0.5">Total Bill</span>
                                <span className="text-[9px] font-black text-indigo-400">Rp {(Number(transaction.grandTotal??0)).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-slate-900 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-slate-900 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-40"></div>
                    
                    <div className="relative lg:flex-1 lg:overflow-y-auto p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 custom-scrollbar scrollbar-dark">
                        
                        {/* INPUT NOMINAL */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-xl sm:rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col group/terminal transition-all hover:bg-white/[0.07] flex-shrink-0">
                            <div className="p-3 sm:p-6 border-b border-white/5">
                                <div className="flex justify-between items-center mb-2 sm:mb-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-indigo-400/20 flex-shrink-0">
                                            <Monitor className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-none mb-0.5 sm:mb-1">Processor</p>
                                            <p className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Active Payment</p>
                                        </div>
                                    </div>
                                    <div className="h-5 sm:h-6 px-1.5 sm:px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center gap-1 sm:gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></div>
                                        <span className="text-[6px] sm:text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live Sync</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:space-y-4">
                                    <p className="text-[9px] sm:text-[11px] font-black text-white/20 uppercase tracking-[0.3em] sm:tracking-[0.5em]">Tendered Amount</p>
                                    <div className="flex items-center justify-end group-focus-within:translate-x-[-10px] transition-transform duration-500">
                                        <input 
                                            type="text"
                                            autoFocus
                                            value={paymentAmount ? Number(paymentAmount).toLocaleString('id-ID') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setPaymentAmount(val);
                                            }}
                                            placeholder="0"
                                            className="bg-transparent text-right text-3xl sm:text-6xl font-black text-white tracking-tighter tabular-nums outline-none w-full placeholder:text-white/5 leading-none selection:bg-indigo-500/40"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 sm:p-6 space-y-2.5 sm:space-y-4">
                                <div className={`py-2.5 sm:py-4 px-3 sm:px-6 rounded-lg sm:rounded-2xl flex justify-between items-center transition-all duration-500 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5'}`}>
                                    <div>
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] block text-white/40 mb-1">{Number(paymentAmount) >= remainingBalance ? 'Customer Change' : 'Still Due'}</span>
                                        <div className="flex items-baseline gap-1 sm:gap-2">
                                            <span className="text-[9px] sm:text-xs font-bold text-white/20 uppercase">Rp</span>
                                            <span className={`text-xl sm:text-3xl font-black tabular-nums tracking-tighter leading-none ${Number(paymentAmount) >= remainingBalance ? 'text-emerald-400' : 'text-white'}`}>
                                                {Math.abs(Number(paymentAmount) - remainingBalance).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center transition-all duration-700 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 rotate-0' : 'bg-white/5 -rotate-12'} flex-shrink-0`}>
                                        {Number(paymentAmount) >= remainingBalance ? <CheckCircle2 className="w-4.5 h-4.5 sm:w-7 sm:h-7 text-white" /> : <Calculator className="w-4.5 h-4.5 sm:w-7 sm:h-7 text-white/20" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                                    <button onClick={() => setPaymentAmount(remainingBalance.toString())} className="h-9 sm:h-12 bg-white/5 border border-white/10 text-white text-[8px] sm:text-[10px] font-extrabold rounded-lg sm:rounded-2xl uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2">
                                        <MousePointer2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" /> Exact Change
                                    </button>
                                    <button onClick={() => setPaymentAmount((Math.ceil(remainingBalance/10000)*10000).toString())} className="h-9 sm:h-12 bg-white/5 border border-white/10 text-white text-[8px] sm:text-[10px] font-extrabold rounded-lg sm:rounded-2xl uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2">
                                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" /> Round Up
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* QUICK ACTIONS */}
                        <div className="space-y-2 sm:space-y-4 pb-3 sm:pb-6 flex-shrink-0">
                            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                                <button onClick={() => setIsSplitBillOpen(true)} className="py-2 sm:py-3 bg-indigo-500 text-white rounded-lg sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 hover:bg-indigo-400 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 border-b-4 border-indigo-700 group">
                                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Split</span>
                                </button>
                                <button onClick={handleMergePrompt} className="py-2 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 active:scale-95 transition-all group">
                                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-90 text-indigo-400 group-hover:translate-y-1 transition-transform" />
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Merge</span>
                                </button>
                                <button onClick={handleHoldBill} className="py-2 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 active:scale-95 transition-all group">
                                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 group-hover:-translate-y-1 transition-transform" />
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Hold</span>
                                </button>
                                <button onClick={handlePrint} className="py-2 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 active:scale-95 transition-all group">
                                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Print</span>
                                </button>
                            </div>

                            {/* VOUCHER INPUT */}
                            <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] border border-white/10 flex flex-col gap-2 sm:gap-3">
                                <h3 className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-1"><ReceiptIcon className="w-3 h-3" /> Kode Voucher</h3>
                                <div className="flex gap-2">
                                    {transaction?.voucherCode ? (
                                        <>
                                            <div className="flex-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{transaction.voucherCode}</span>
                                                <span className="text-[8px] font-bold text-indigo-300">Aktif</span>
                                            </div>
                                            <button onClick={handleRemoveVoucher} className="px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg font-bold text-[8px] tracking-widest uppercase transition-all active:scale-95 flex items-center gap-1">
                                                <X className="w-3 h-3" /> Batal
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <input type="text" placeholder="Ketik kode..." value={voucherCodeInput} onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())} className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-black text-yellow-400 uppercase tracking-widest placeholder:text-white/20 outline-none focus:border-indigo-500" />
                                            <button onClick={handleApplyVoucher} disabled={isApplyingVoucher || !voucherCodeInput.trim()} className={`px-2.5 rounded-lg font-bold text-[8px] tracking-widest uppercase transition-all ${isApplyingVoucher || !voucherCodeInput.trim() ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'}`}>
                                                {isApplyingVoucher ? '...' : 'Terapkan'}
                                            </button>
                                        </>
                                    )}
                                </div>
                                {transaction?.cashbackEarned > 0 && (
                                    <div className="text-[8px] font-bold text-emerald-400 bg-emerald-400/10 p-1.5 rounded-lg text-center flex items-center justify-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Cashback Rp {Number(transaction.cashbackEarned).toLocaleString()} setelah lunas!
                                    </div>
                                )}
                            </div>

                            {/* PAYMENT METHODS */}
                            <div className="bg-white/5 p-3 sm:p-5 rounded-xl sm:rounded-[2rem] border border-white/10 space-y-2.5 sm:space-y-4">
                                <div className="flex items-center gap-3 justify-center">
                                    <div className="w-4 h-px bg-gradient-to-r from-transparent to-white/10"></div>
                                    <h3 className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.4em] sm:tracking-[0.5em]">Payment Cluster</h3>
                                    <div className="w-4 h-px bg-gradient-to-l from-transparent to-white/10"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    {(settings?.availablePaymentMethods || ['CASH', 'QRIS', 'BCA', 'BNI', 'BRI', 'DANA', 'OVO', 'GOPAY', 'MEMBERSHIP']).map((m: string) => {
                                        const isSelected = paymentMethod === m.toUpperCase();
                                        return (
                                            <button key={m} onClick={() => setPaymentMethod(m.toUpperCase())} className={`group relative h-10 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-500/40 scale-[1.02] z-10' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/10'}`}>
                                                {isSelected && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-lg"><div className="w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div></div>}
                                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{m}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* LUNASKAN BUTTON */}
                            <button
                                onClick={() => {
                                    if (remainingBalance === 0) {
                                        if (transaction.status === 'PAID' || transaction.status === 'COMPLETED') {
                                            handlePaymentDone();
                                        } else {
                                            processPayment();
                                        }
                                    } else {
                                        setIsConfirmModalOpen(true);
                                    }
                                }}
                                disabled={isSubmitting || (remainingBalance > 0 && (!paymentMethod || Number(paymentAmount) < remainingBalance))}
                                className={`w-full group relative overflow-hidden h-14 sm:h-20 rounded-xl sm:rounded-[2rem] font-black transition-all duration-500 ${
                                    (isSubmitting || (remainingBalance > 0 && (!paymentMethod || Number(paymentAmount) < remainingBalance)))
                                    ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.5)] hover:-translate-y-1 active:translate-y-0.5'
                                }`}
                            >
                                <div className="flex items-center justify-between px-3 sm:px-6 relative z-10">
                                    <div className="flex items-center gap-2.5 sm:gap-5">
                                        <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner transition-colors duration-500 ${((remainingBalance > 0 && (!paymentMethod || Number(paymentAmount) < remainingBalance))) ? 'bg-white/5' : 'bg-white/20'}`}>
                                            <ShieldCheck className={`w-4.5 h-4.5 sm:w-6 sm:h-6 ${remainingBalance === 0 || (paymentMethod && remainingBalance > 0 && Number(paymentAmount) >= remainingBalance) ? 'animate-pulse text-white' : 'text-white/20'}`} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[8px] sm:text-[10px] font-black uppercase opacity-60 tracking-[0.3em] sm:tracking-[0.4em] mb-0.5">{remainingBalance === 0 ? 'Verified Paid' : 'Ready to Settle'}</span>
                                            <span className="text-lg sm:text-2xl font-black tracking-tight leading-none uppercase">
                                                {remainingBalance === 0 ? 'SELESAIKAN MEJA' : 'LUNASKAN'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8 opacity-20 group-hover:translate-x-4 transition-transform duration-500" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            
            {/* 04. FLOATING CFD MIRROR: PREMIUM FEEDBACK */}
            <div className="hidden lg:block fixed bottom-10 right-10 z-[60] w-72 aspect-video bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden group hover:scale-105 transition-all duration-500 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                
                <div className="absolute top-4 left-6 flex items-center gap-3 z-10">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">CFD Live Mirror</span>
                </div>

                <div className="h-full flex flex-col items-center justify-center p-6 relative z-0">
                    <div className="text-center space-y-4 opacity-90">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.4em]">Balance Remaining</p>
                            <p className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                                <span className="text-sm opacity-20 mr-1.5 font-bold">Rp</span>
                                {remainingBalance.toLocaleString()}
                            </p>
                        </div>
                        
                        {Number(paymentAmount) > 0 && (
                            <div className="pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-500">
                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1">Customer Change</p>
                                <p className="text-xl font-black text-emerald-400 leading-none">Rp {Math.max(0, Number(paymentAmount) - remainingBalance).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 border-2 border-white/5 rounded-[2.5rem] pointer-events-none"></div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                .scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
                .scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .animate-shimmer { animation: shimmer 2s infinite linear; }
            `}</style>

            <PaymentConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { if (!isPaymentSuccess) setIsConfirmModalOpen(false); }}
                onConfirm={processPayment}
                onPrint={handlePrint}
                onDone={handlePaymentDone}
                isPaid={isPaymentSuccess}
                isLoading={isSubmitting}
                transaction={transaction}
                settings={settings}
                data={lastPaymentInfo || {
                    total: remainingBalance,
                    method: paymentMethod,
                    payAmount: Number(paymentAmount || 0),
                    change: Math.max(0, Number(paymentAmount || 0) - remainingBalance)
                }}
            />

            <MergeModal
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
                onMerge={handleConfirmMerge}
                sourceTableId={Number(tableId)}
                tableType={(tableType as 'billiard' | 'cafe') || 'billiard'}
            />

            {isSplitBillOpen && (
                <SplitBillDashboard
                    transaction={transaction}
                    settings={settings}
                    initialSelectedItems={selectedItems}
                    onPaymentSuccess={(updatedTx) => { if (updatedTx) setTransaction(updatedTx); else fetchTransaction(); }}
                    onClose={() => setIsSplitBillOpen(false)}
                />
            )}

        </div>

        {/* PRINT ONLY SECTION - Located outside the main h-screen to avoid layout shifts */}
        <div id="printable-invoice" className="hidden print:block font-mono text-[10px]">
            <ThermalReceipt 
                tx={transaction} 
                settings={settings} 
                paymentMethodOverride={paymentMethod}
            />
        </div>
    </>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-50 flex items-center justify-center animate-pulse text-[9px] font-black text-slate-400 tracking-widest italic">PREPARING...</div>}>
            <BillingContent />
        </Suspense>
    );
}
