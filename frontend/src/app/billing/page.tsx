/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, ChevronRight, Wallet, Timer, CheckCircle2, 
    QrCode, Receipt as ReceiptIcon, Receipt, Calculator, 
    Coffee, Check, ShieldCheck, Zap, Printer, CreditCard,
    Coins, Monitor, Minus, MousePointer2, Sparkles, Activity
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

    const groupedItems = React.useMemo(() => {
        if (!transaction?.orderItems) return [];
        const groups: Record<string, any> = {};
        transaction.orderItems.forEach((item: any) => {
            const key = `${item.menuItemId || item.menuItem?.id}-${item.priceAtOrder}-${item.customName || ''}`;
            if (groups[key]) {
                groups[key].quantity += item.quantity;
            } else {
                groups[key] = { ...item };
            }
        });
        return Object.values(groups);
    }, [transaction?.orderItems]);

    const remainingBalance = getRemainingBalance();

    const processPayment = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const idempotencyKey = generateIdempotencyKey('payment', user?.id);
            
            await axios.post(`/transactions/${transaction.id}/pay`, {
                amount: Number(paymentAmount),
                method: (paymentMethod || 'CASH').toUpperCase(),
                userId: user?.id,
                idempotencyKey
            });
            
            setIsSubmitting(false);
            // Jangan langsung navigate — biarkan kasir cetak struk dulu
            setIsPaymentSuccess(true);
        } catch (error) {
            setIsSubmitting(false);
            showAlert('Gagal', 'Pembayaran gagal.', { variant: 'error' });
        }
    };

    const handlePaymentDone = () => {
        setIsConfirmModalOpen(false);
        setIsPaymentSuccess(false);
        router.push(tableType === 'cafe' ? '/cafe' : '/');
    };

    // Keyboard Shortcuts (Enter to confirm, Esc to go back)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const canPay = !isSubmitting && paymentMethod && Number(paymentAmount) >= remainingBalance;
                if (canPay && !isConfirmModalOpen) {
                    setIsConfirmModalOpen(true);
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
        <div className="h-screen bg-[#F0F4F8] flex flex-col font-sans text-slate-900 overflow-hidden print:hidden selection:bg-indigo-100 italic-none">
            {/* 01. PREVIUM HEADER: GHOST GLASSMISM */}
            <header className="h-16 bg-white/40 backdrop-blur-xl border-b border-white/40 px-8 sm:px-12 flex items-center justify-between z-50 flex-shrink-0 sticky top-0 shadow-sm shadow-slate-200/20">
                <div className="flex items-center gap-10">
                    <button 
                        onClick={() => router.push(tableType === 'cafe' ? '/cafe' : '/')} 
                        className="group flex items-center justify-center w-10 h-10 bg-white rounded-2xl shadow-sm border border-slate-200/50 hover:bg-slate-50 transition-all hover:-translate-x-1 active:scale-90"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </button>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-indigo-500 opacity-50" />
                            <h1 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-none">Terminal v2.6</h1>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            {transaction.table?.tableName || transaction.cafeTable?.tableName || 'Order Cabinet'} 
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-indigo-600 font-bold opacity-80">{terminalId}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`group flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-500 overflow-hidden relative cursor-default ${isConnected ? 'bg-white border-slate-200/50 shadow-sm' : 'bg-rose-50 border-rose-100'}`}>
                        {isConnected && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent"></div>}
                        <div className="relative flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full relative ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}>
                                {isConnected && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40"></div>}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isConnected ? 'text-slate-500' : 'text-rose-600'}`}>
                                {isConnected ? 'Display Synchronized' : 'Display Offline'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 overflow-hidden bg-gradient-to-br from-slate-50 via-[#F0F4F8] to-slate-100">
                {/* 02. LEFT PANEL: ORDER DETAILS & SUMMARY */}
                <section className="col-span-12 lg:col-span-7 h-full flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-8">
                            
                            {/* 02a. SESSION CARD: DEEP GLASS */}
                            {Number(transaction.billiardTotal) > 0 && (
                                <div className="group relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/20 flex justify-between items-center transition-all hover:scale-[1.005]">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-white/5 opacity-50"></div>
                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                                    
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                                            <Timer className="w-7 h-7 text-indigo-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1.5 opacity-80">Active Service</p>
                                            <h3 className="text-xl font-black tracking-tight leading-none uppercase">
                                                {transaction.fareName || 'Standard'} 
                                                <span className="mx-3 opacity-20 font-light">|</span>
                                                <span className="text-indigo-200">{transaction.sessionDuration}</span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className="text-sm font-bold text-white/40 uppercase tracking-widest mb-1">Fee</p>
                                        <p className="text-[36px] font-black tracking-tighter tabular-nums leading-none">
                                            <span className="text-sm opacity-40 mr-1.5">Rp</span>
                                            {Number(transaction.billiardTotal).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 02b. ORDER LIST: SOFT TILES */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-5 px-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Inventory Breakdown</h3>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                                </div>
                                <div className="grid gap-3">
                                    {groupedItems.map((item: any, i: number) => (
                                        <div key={i} className="group flex justify-between items-center p-5 bg-white border border-slate-200/50 rounded-[1.8rem] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-default">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-900 shadow-sm group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                    {item.quantity}<span className="text-[10px] opacity-40 ml-0.5">×</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-[15px] font-bold text-slate-800 tracking-tight mb-0.5">{(item.customName || item.menuItem?.name)}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit: Rp {Number(item.priceAtOrder).toLocaleString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-extrabold text-slate-900 tabular-nums tracking-tight">
                                                    <span className="text-[10px] opacity-30 mr-1 font-bold">Rp</span>
                                                    {(item.priceAtOrder * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {groupedItems.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center bg-white/50 border border-dashed border-slate-200 rounded-[2.5rem]">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 opacity-40">
                                                <Receipt className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Items Ordered</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 02c. LEFT FOOTER: CRYSTAL SUMMARY */}
                    <div className="p-8 pb-12 bg-white/20 backdrop-blur-md border-t border-white/40 mt-auto">
                        <div className="max-w-3xl mx-auto">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
                                    <p className="text-sm font-black text-slate-900 tabular-nums">Rp {(Number(transaction.sessionTotals?.subtotal || transaction.subtotal) || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disc</p>
                                    <p className="text-sm font-black text-rose-500 tabular-nums">Rp {(Number(transaction.sessionTotals?.discountAmount || transaction.discountAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</p>
                                    <p className="text-sm font-black text-slate-800 tabular-nums">Rp {(Number(transaction.sessionTotals?.serviceChargeAmount || transaction.serviceChargeAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax ({settings?.ppnPercentage}%)</p>
                                    <p className="text-sm font-black text-slate-800 tabular-nums">Rp {(Number(transaction.sessionTotals?.vatAmount || transaction.vatAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-6">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Bill</p>
                                    <p className="text-sm font-black text-indigo-600 tabular-nums">Rp {(Number(transaction.sessionTotals?.grandTotal || transaction.sessionTotals?.total || transaction.grandTotal) || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                    <p className="text-sm font-black text-emerald-600 tabular-nums">Rp {(Number(transaction.paidAmount) || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-6 border-t border-slate-200/50">
                                <div className="relative">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] italic">Required Amount</span>
                                        <span className={`text-6xl font-black tracking-tighter leading-none tabular-nums ${remainingBalance > 0 ? 'text-slate-900' : 'text-emerald-500'}`}>
                                            <span className="text-2xl mr-2 opacity-20">Rp</span>
                                            {remainingBalance.toLocaleString()}
                                        </span>
                                    </div>
                                    {remainingBalance === 0 && (
                                        <div className="flex items-center gap-2 text-emerald-600 mt-3 absolute -bottom-8">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Settlement Complete</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 03. RIGHT PANEL: GLASS COMMAND HUB */}
                <section className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden relative border-l border-white/20">
                    <div className="absolute inset-0 bg-slate-900 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-slate-900 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-40"></div>
                    
                    <div className="relative flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col gap-8 custom-scrollbar scrollbar-dark">
                        
                        {/* 03a. INPUT TERMINAL: NEON GLASS */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col group/terminal transition-all hover:bg-white/[0.07]">
                            <div className="p-8 sm:p-10 border-b border-white/5">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-indigo-400/20">
                                            <Monitor className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] leading-none mb-1">Processor</p>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Active Payment</p>
                                        </div>
                                    </div>
                                    <div className="h-6 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></div>
                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live Sync</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em]">Tendered Amount</p>
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
                                            className="bg-transparent text-right text-6xl sm:text-7xl font-black text-white tracking-tighter tabular-nums outline-none w-full placeholder:text-white/5 leading-none selection:bg-indigo-500/40"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className={`py-6 px-8 rounded-[2rem] flex justify-between items-center transition-all duration-500 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5'}`}>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] block text-white/40 mb-1.5">{Number(paymentAmount) >= remainingBalance ? 'Customer Change' : 'Still Due'}</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-bold text-white/20 uppercase">Rp</span>
                                            <span className={`text-3xl font-black tabular-nums tracking-tighter leading-none ${Number(paymentAmount) >= remainingBalance ? 'text-emerald-400' : 'text-white'}`}>
                                                {Math.abs(Number(paymentAmount) - remainingBalance).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 rotate-0' : 'bg-white/5 -rotate-12'}`}>
                                        {Number(paymentAmount) >= remainingBalance ? <CheckCircle2 className="w-7 h-7 text-white" /> : <Calculator className="w-7 h-7 text-white/20" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setPaymentAmount(remainingBalance.toString())} className="h-14 bg-white/5 border border-white/10 text-white text-[10px] font-extrabold rounded-2xl uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <MousePointer2 className="w-3 h-3 text-indigo-400" /> Exact Change
                                    </button>
                                    <button onClick={() => setPaymentAmount((Math.ceil(remainingBalance/10000)*10000).toString())} className="h-14 bg-white/5 border border-white/10 text-white text-[10px] font-extrabold rounded-2xl uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Zap className="w-3 h-3 text-indigo-400" /> Round Up
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 03b. QUICK ACTIONS & METHODS */}
                        <div className="space-y-8 pb-10">
                            <div className="grid grid-cols-4 gap-3">
                                <button onClick={() => setIsSplitBillOpen(true)} className="aspect-square bg-indigo-500 text-white rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-400 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 border-b-4 border-indigo-700 group">
                                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Split</span>
                                </button>
                                <button onClick={handleMergePrompt} className="aspect-square bg-white/5 border border-white/10 text-white rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all group">
                                    <ChevronRight className="w-5 h-5 rotate-90 text-indigo-400 group-hover:translate-y-1 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Merge</span>
                                </button>
                                <button onClick={handleHoldBill} className="aspect-square bg-white/5 border border-white/10 text-white rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all group">
                                    <Coins className="w-5 h-5 text-indigo-400 group-hover:-translate-y-1 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Hold</span>
                                </button>
                                <button onClick={handlePrint} className="aspect-square bg-white/5 border border-white/10 text-white rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all group">
                                    <Printer className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Print</span>
                                </button>
                            </div>

                            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
                                <div className="flex items-center gap-3 justify-center mb-2">
                                    <div className="w-4 h-px bg-gradient-to-r from-transparent to-white/10"></div>
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Payment Cluster</h3>
                                    <div className="w-4 h-px bg-gradient-to-l from-transparent to-white/10"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(settings?.availablePaymentMethods || ['CASH', 'QRIS', 'BCA', 'BNI', 'BRI', 'DANA', 'OVO', 'GOPAY', 'MEMBERSHIP']).map((m: string) => {
                                        const isSelected = paymentMethod === m.toUpperCase();
                                        return (
                                            <button 
                                                key={m} 
                                                onClick={() => setPaymentMethod(m.toUpperCase())}
                                                className={`group relative h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-500/40 scale-105 z-10' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/10'}`}
                                            >
                                                {isSelected && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div></div>}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={isSubmitting || !paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0}
                                className={`w-full group relative overflow-hidden h-24 rounded-[3rem] font-black transition-all duration-500 ${
                                    (isSubmitting || !paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0)
                                    ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:translate-y-0.5'
                                }`}
                            >
                                <div className="flex items-center justify-between px-10 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-500 ${(!paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0) ? 'bg-white/5' : 'bg-white/20'}`}>
                                            <ShieldCheck className={`w-8 h-8 ${paymentMethod && remainingBalance > 0 && Number(paymentAmount) >= remainingBalance ? 'animate-pulse text-white' : 'text-white/20'}`} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[10px] font-black uppercase opacity-60 tracking-[0.4em] mb-1">{remainingBalance === 0 ? 'Verified' : 'Ready to Settle'}</span>
                                            <span className="text-3xl font-black tracking-tight leading-none uppercase">
                                                {remainingBalance === 0 ? 'PAID' : 'LUNASKAN'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-10 h-10 opacity-20 group-hover:translate-x-4 transition-transform duration-500" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            
            {/* 04. FLOATING CFD MIRROR: PREMIUM FEEDBACK */}
            <div className="fixed bottom-10 right-10 z-[60] w-72 aspect-video bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden group hover:scale-105 transition-all duration-500 cursor-pointer">
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
                data={{
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
