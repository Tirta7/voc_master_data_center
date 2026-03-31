/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, Wallet, Timer, CheckCircle2, QrCode, Receipt as ReceiptIcon, Receipt, Calculator, Coffee, Check, ShieldCheck, Zap, Printer, CreditCard } from 'lucide-react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import PaymentConfirmationModal from '@/components/billing/PaymentConfirmationModal';
import SplitBillDashboard from '@/components/billing/SplitBillDashboard';
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
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [settings, setSettings] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
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
            const rem = Number(response.data.grandTotal || 0);
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

    // REAL-TIME CFD SYNC (MQTT & SOCKET)
    useEffect(() => {
        if (transaction) {
            const currentTableId = tableId || transaction.tableId || transaction.table?.id || transaction.cafeTable?.id;
            const rem = Number(transaction.grandTotal || 0);
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
        const rem = Number(transaction.grandTotal || 0);
        return rem <= 1 ? 0 : rem;
    }, [transaction]);

    const groupedItems = React.useMemo(() => {
        if (!transaction?.orderItems) return [];
        const groups: Record<string, any> = {};
        transaction.orderItems.forEach((item: any) => {
            // Skip zero-priced bundle sub-items to avoid redundant display
            if (item.bundleGroupId && Number(item.priceAtOrder || 0) === 0) return;
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
            setIsConfirmModalOpen(false);
            await showAlert('Berhasil', 'Pembayaran sukses!', { variant: 'success' });
            router.push(tableType === 'cafe' ? '/cafe' : '/');
        } catch (error) {
            setIsSubmitting(false);
            showAlert('Gagal', 'Pembayaran gagal.', { variant: 'error' });
        }
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
        const targetTableId = prompt('Masukkan ID Meja target:');
        if (targetTableId) {
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
                await axios.post(`/transactions/merge`, {
                    sourceTableId: Number(tableId),
                    targetTableId: Number(targetTableId),
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
        <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden print:hidden">
            {/* Header: Ultra Slim Pro */}
            <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 sm:px-10 flex items-center justify-between z-50 flex-shrink-0 sticky top-0">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push(tableType === 'cafe' ? '/cafe' : '/')} className="hover:bg-slate-100 p-2.5 rounded-xl transition-all active:scale-90">
                        <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-indigo-600" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">Billing Terminal</h1>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            {transaction.table?.tableName || transaction.cafeTable?.tableName || 'Order Cabinet'} • <span className="text-indigo-600 italic">{terminalId}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 animate-pulse'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'Display Link OK' : 'No Display Link'}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* MAIN: COMPACT DASHBOARD GRID */}
                <section className="col-span-12 lg:col-span-7 bg-white h-full flex flex-col border-r border-slate-100 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-8">
                            
                            {/* Session Header (Modern Slim) */}
                            {Number(transaction.billiardTotal) > 0 && (
                                <div className="group relative overflow-hidden bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl flex justify-between items-center transition-all hover:scale-[1.01]">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent"></div>
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                                            <Timer className="w-6 h-6 text-indigo-100" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Session Service</p>
                                            <h3 className="text-lg font-black tracking-tight leading-none uppercase">{transaction.fareName || 'Standard'} • {transaction.sessionDuration}</h3>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className="text-[32px] font-black tracking-tighter tabular-nums leading-none">Rp {Number(transaction.billiardTotal).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Inventory List (High Density Grid) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <Coffee className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Inventory List</h3>
                                    <div className="flex-1 h-px bg-slate-100"></div>
                                </div>
                                <div className="grid gap-2">
                                    {groupedItems.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100/50 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-default border-dashed">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[12px] font-black text-slate-900 shadow-sm">
                                                    {item.quantity}×
                                                </div>
                                                <div>
                                                    <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">{(item.customName || item.menuItem?.name)}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">@ {Number(item.priceAtOrder).toLocaleString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <p className="text-lg font-black text-slate-900 tabular-nums">Rp {(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {groupedItems.length === 0 && (
                                        <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale scale-75">
                                            <Receipt className="w-12 h-12 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No Items Added</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Left Footer Summary (Enhanced for Transparency) */}
                    <div className="p-6 bg-white border-t border-slate-100 mt-auto">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {/* Detailed breakdown */}
                            {/* Detailed breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-[10px] font-black uppercase tracking-wider">
                                <div className="space-y-1">
                                    <p className="text-slate-400">Subtotal</p>
                                    <p className="text-slate-900 font-mono">Rp {(Number(transaction.sessionTotals?.subtotal || transaction.subtotal) || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400">Disc ({Number(transaction.sessionTotals?.discountAmount || transaction.discountAmount || 0) > 0 ? '-' : ''})</p>
                                    <p className="text-rose-500 font-mono">Rp {(Number(transaction.sessionTotals?.discountAmount || transaction.discountAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400">Service ({settings?.serviceChargePercentage || 0}%)</p>
                                    <p className="text-slate-900 font-mono">Rp {(Number(transaction.sessionTotals?.serviceChargeAmount || transaction.serviceChargeAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400">Pajak ({settings?.ppnPercentage || 0}%)</p>
                                    <p className="text-slate-900 font-mono">Rp {(Number(transaction.sessionTotals?.vatAmount || transaction.vatAmount || 0)).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400">Total Bill</p>
                                    <p className="text-indigo-600 font-mono">Rp {(Number(transaction.sessionTotals?.grandTotal || transaction.sessionTotals?.total || transaction.grandTotal) || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400">Paid</p>
                                    <p className="text-emerald-600 font-mono">Rp {(Number(transaction.paidAmount) || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-black text-slate-300 italic">BALANCE DUE</span>
                                        <span className={`text-[48px] font-black tracking-tighter leading-none tabular-nums ${remainingBalance > 0 ? 'text-slate-950' : 'text-emerald-600'}`}>
                                            Rp {remainingBalance.toLocaleString()}
                                        </span>
                                    </div>
                                    {remainingBalance === 0 && (
                                        <div className="flex items-center gap-2 text-emerald-600 animate-bounce">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Tagihan Sudah Lunas</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT: COMMAND CENTER (INTEGRATED CONSOLE) */}
                <section className="col-span-12 lg:col-span-5 bg-slate-50/50 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 custom-scrollbar">
                        
                        {/* 01. Integrated Input Console */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col flex-shrink-0">
                            <div className="bg-slate-900 p-6 sm:p-8 text-white">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Terminal Active</span>
                                    </div>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Payment Processor</span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-4">Input Nominal</p>
                                    <div className="flex items-center justify-end">
                                        <input 
                                            type="text"
                                            autoFocus
                                            value={paymentAmount ? Number(paymentAmount).toLocaleString('id-ID') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setPaymentAmount(val);
                                            }}
                                            placeholder="0"
                                            className="bg-transparent text-right text-[4rem] sm:text-[4.5rem] font-black text-white tracking-tighter tabular-nums outline-none w-full placeholder:text-white/5 leading-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className={`py-4 px-6 rounded-2xl flex justify-between items-center border-2 transition-all duration-300 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] block opacity-50 mb-0.5">{Number(paymentAmount) >= remainingBalance ? 'Uang Kembali' : 'Kurang Bayar'}</span>
                                        <span className="text-2xl font-black tabular-nums tracking-tighter italic leading-none">Rp {Math.abs(Number(paymentAmount) - remainingBalance).toLocaleString()}</span>
                                    </div>
                                    {Number(paymentAmount) >= remainingBalance ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Calculator className="w-6 h-6 opacity-20" />}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPaymentAmount(remainingBalance.toString())} className="h-12 bg-white border border-slate-200 text-slate-900 text-[10px] font-black rounded-xl uppercase tracking-widest hover:border-indigo-600 transition-all shadow-sm">Uang Pas</button>
                                    <button onClick={() => setPaymentAmount((Math.ceil(remainingBalance/10000)*10000).toString())} className="h-12 bg-white border border-slate-200 text-slate-900 text-[10px] font-black rounded-xl uppercase tracking-widest hover:border-indigo-600 transition-all shadow-sm">Bulatkan</button>
                                </div>
                            </div>
                        </div>

                        {/* 02. Methods & Actions */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setIsSplitBillOpen(true)} className="aspect-square bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:bg-black active:scale-95 transition-all shadow-lg border-b-4 border-slate-950">
                                    <Zap className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Split</span>
                                </button>
                                <button onClick={handleMergePrompt} className="aspect-square bg-white border border-slate-200 text-slate-900 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-slate-400 active:scale-95 transition-all shadow-sm border-b-4">
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Merge</span>
                                </button>
                                <button onClick={handleHoldBill} className="aspect-square bg-white border border-slate-200 text-slate-900 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-slate-400 active:scale-95 transition-all shadow-sm border-b-4">
                                    <Timer className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Hold</span>
                                </button>
                                <button onClick={handlePrint} className="aspect-square bg-white border border-slate-200 text-slate-900 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-slate-400 active:scale-95 transition-all shadow-sm border-b-4">
                                    <Printer className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Print</span>
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] text-center mb-1">Select Payment Method</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {(settings?.availablePaymentMethods || ['CASH', 'QRIS', 'BCA', 'BNI', 'BRI', 'DANA', 'OVO', 'GOPAY', 'MEMBERSHIP']).map((m: string) => {
                                        const isSelected = paymentMethod === m.toUpperCase();
                                        return (
                                            <button 
                                                key={m} 
                                                onClick={() => setPaymentMethod(m.toUpperCase())}
                                                className={`h-11 rounded-xl flex items-center justify-center px-1 transition-all border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105 relative z-10' : 'bg-slate-50 border-transparent text-slate-400 hover:border-indigo-100 hover:text-slate-600'}`}
                                            >
                                                <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={isSubmitting || !paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0}
                                className={`w-full group relative overflow-hidden h-20 rounded-[2rem] font-black transition-all ${
                                    (isSubmitting || !paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0)
                                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-50 grayscale'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-200 border-b-[6px] border-indigo-950 active:border-b-2 active:translate-y-1'
                                }`}
                            >
                                <div className="flex items-center justify-between px-10 relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(!paymentMethod || (remainingBalance > 0 && Number(paymentAmount) < remainingBalance) || remainingBalance === 0) ? 'bg-slate-200/50' : 'bg-white/20'}`}>
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[10px] font-black uppercase opacity-60 tracking-[0.3em]">{remainingBalance === 0 ? 'Transaction Paid' : 'Confirm Payment'}</span>
                                            <span className="text-2xl font-black tracking-tighter italic leading-none uppercase">{remainingBalance === 0 ? 'LUNAS' : 'LUNASKAN'}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-8 h-8 opacity-30 group-hover:translate-x-3 transition-transform" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    </div>
                </section>
            </main>
            
            {/* CFD LIVE REPLICA (Premium Feedback) */}
            <div className="fixed bottom-6 right-6 z-[60] w-64 aspect-video bg-black rounded-2xl shadow-3xl border border-white/10 overflow-hidden group hover:scale-110 transition-transform cursor-pointer">
                <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-sm"></div>
                
                <div className="absolute top-2 left-3 flex items-center gap-2 z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Customer Display Live Mirror</span>
                </div>

                <div className="h-full flex flex-col items-center justify-center p-4 relative z-0">
                    <div className="text-center space-y-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <p className="text-[6px] font-black text-indigo-400 uppercase tracking-widest">BILLING SUMMARY</p>
                        <p className="text-xl font-black text-white leading-none">Rp {remainingBalance.toLocaleString()}</p>
                        
                        {Number(paymentAmount) > 0 && (
                            <div className="pt-2 animate-bounce">
                                <p className="text-[6px] font-black text-emerald-400 uppercase tracking-widest">CUSTOMER CHANGE</p>
                                <p className="text-sm font-black text-emerald-400 leading-none">Rp {Math.max(0, Number(paymentAmount) - remainingBalance).toLocaleString()}</p>
                            </div>
                        )}
                        
                        {Number(paymentAmount) === 0 && (
                            <div className="pt-4 flex justify-center gap-2">
                                <div className="w-6 h-1 bg-white/5 rounded-full"></div>
                                <div className="w-4 h-1 bg-white/5 rounded-full"></div>
                                <div className="w-2 h-1 bg-white/5 rounded-full"></div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 border-2 border-white/5 rounded-2xl pointer-events-none"></div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .animate-shimmer { animation: shimmer 2s infinite linear; }
            `}</style>

            <PaymentConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={processPayment}
                onPrint={handlePrint}
                isLoading={isSubmitting}
                data={{
                    total: remainingBalance,
                    method: paymentMethod,
                    payAmount: Number(paymentAmount || 0),
                    change: Math.max(0, Number(paymentAmount || 0) - remainingBalance)
                }}
            />

            {isSplitBillOpen && (
                <SplitBillDashboard
                    transaction={transaction}
                    settings={settings}
                    onPaymentSuccess={(updatedTx) => { if (updatedTx) setTransaction(updatedTx); else fetchTransaction(); }}
                    onClose={() => setIsSplitBillOpen(false)}
                />
            )}

        </div>

        {/* PRINT ONLY SECTION - Located outside the main h-screen to avoid layout shifts */}
        <div id="printable-invoice" className="hidden print:block font-mono text-[10px]">
            <ThermalReceipt tx={transaction} settings={settings} />
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
