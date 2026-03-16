/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, Wallet, Timer, CheckCircle2, QrCode, Receipt as ReceiptIcon, Calculator, Coffee, Check, ShieldCheck, Zap, Printer, CreditCard } from 'lucide-react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import PaymentConfirmationModal from '@/components/billing/PaymentConfirmationModal';
import SplitBillDashboard from '@/components/billing/SplitBillDashboard';
import { useAuth } from '@/context/AuthContext';
import ThermalReceipt from '@/components/ThermalReceipt';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
import { generateIdempotencyKey } from '@/utils/transactionUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
                ? `${API_URL}/transactions/${knownTxId}`
                : `${API_URL}/transactions/table/${tableId}${tableType ? `?type=${tableType}` : ''}`;
            const token = localStorage.getItem('token');
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    const remainingBalance = getRemainingBalance();

    const processPayment = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const idempotencyKey = generateIdempotencyKey('payment', user?.id);
            
            await axios.post(`${API_URL}/transactions/${transaction.id}/pay`, {
                amount: Number(paymentAmount),
                method: (paymentMethod || 'CASH').toUpperCase(),
                userId: user?.id,
                idempotencyKey
            }, config);
            
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
                const token = localStorage.getItem('token');
                await axios.post(`${API_URL}/transactions/merge`, {
                    sourceTableId: Number(tableId),
                    targetTableId: Number(targetTableId),
                    userId: user?.id,
                    idempotencyKey: generateIdempotencyKey('merge', user?.id)
                }, { headers: { Authorization: `Bearer ${token}` } });
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
        const isInfos = await showConfirm('Simpan', 'Simpan sebagai piutang?', { confirmLabel: 'Simpan' });
        if (isInfos) {
            setIsSubmitting(true);
            try {
                const token = localStorage.getItem('token');
                await axios.post(`${API_URL}/transactions/${transaction.id}/hold`, { userId: user?.id, idempotencyKey: generateIdempotencyKey('hold', user?.id) }, { headers: { Authorization: `Bearer ${token}` } });
                setIsSubmitting(false);
                showAlert('Berhasil', 'Tersimpan.', { variant: 'success' });
                router.push('/admin/finance/debts');
            } catch (error) {
                setIsSubmitting(false);
                showAlert('Gagal', 'Gagal menyimpan.', { variant: 'error' });
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
                        <span className="text-[9px] font-black uppercase tracking-widest">{isConnected ? 'CFD Synchronized' : 'CFD Interrupted'}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <button onClick={handleMergePrompt} className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-xl uppercase tracking-widest transition-all">Merge Meja</button>
                    <button onClick={() => setIsSplitBillOpen(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all">Split Bill</button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* LEFT: INVOICE (SCROLLABLE) */}
                <section className="col-span-12 lg:col-span-7 flex flex-col bg-white border-r border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-white flex-shrink-0">
                         <div className="flex items-center gap-3">
                            <ReceiptIcon className="w-4 h-4 text-slate-400" />
                            <h2 className="text-[11px] font-black text-slate-950 uppercase tracking-widest">Rincian Transaksi</h2>
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 tabular-nums uppercase">{transaction.invoiceNumber}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-4 custom-scrollbar">
                        <div className="max-w-2xl mx-auto space-y-6">
                             {/* Billiard Rental Card (Slimmer) */}
                             {Number(transaction.billiardTotal) > 0 && (
                                <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-md flex justify-between items-center relative overflow-hidden">
                                     <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                     <div className="flex items-center gap-3 relative z-10">
                                        <Timer className="w-5 h-5 opacity-60" />
                                        <div>
                                            <p className="text-[8px] font-black text-white/50 uppercase">Session Service</p>
                                            <h3 className="text-xs font-black uppercase tracking-tight">{transaction.fareName || 'Standard'} • {transaction.sessionDuration}</h3>
                                        </div>
                                     </div>
                                     <p className="text-xl font-black tabular-nums tracking-tighter relative z-10">Rp {Number(transaction.billiardTotal).toLocaleString()}</p>
                                </div>
                            )}

                            {/* Inventory Group */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 px-2">
                                    <Coffee className="w-3.5 h-3.5 text-slate-300" />
                                    <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Inventory List</h3>
                                    <div className="flex-1 h-px bg-slate-50"></div>
                                </div>
                                <div className="grid gap-1">
                                    {(transaction.orderItems || []).map((item: any, i: number) => (
                                        <div key={i} className="flex flex-col py-3 px-4 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100 group">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-[10px] font-black text-slate-600 tabular-nums">{item.quantity}</span>
                                                    <div>
                                                        <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{(item.customName || item.menuItem?.name)}</h4>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">@ Rp {Number(item.priceAtOrder).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <p className="text-[13px] font-black text-slate-950 tabular-nums">Rp {(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Sticky Bar (Compact) */}
                    <div className="p-6 bg-slate-950 text-white rounded-t-[2.5rem] mt-auto shadow-2xl border-t border-white/5">
                        <div className="flex justify-between items-end max-w-3xl mx-auto lg:mx-0 lg:pl-4">
                            <div className="space-y-1">
                                <div className="flex flex-wrap gap-x-6 text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                    <span>Sub: Rp {displaySubtotal.toLocaleString()}</span>
                                    <span>Tax+: Rp {(Number(transaction.vatAmount || 0) + Number(transaction.serviceChargeAmount || 0)).toLocaleString()}</span>
                                    {Number(transaction.discountAmount || 0) > 0 && <span className="text-rose-400">Disc: -Rp {Number(transaction.discountAmount).toLocaleString()}</span>}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-xl font-black text-slate-800 italic leading-none">IDR</span>
                                    <span className="text-5xl font-black text-white tracking-tighter leading-none tabular-nums">
                                        {(Number(transaction.grandTotal) || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {Number(transaction.paidAmount) > 0 && (
                                    <div className="px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">PAID: Rp {Number(transaction.paidAmount).toLocaleString()}</div>
                                )}
                                <div className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Billing Ready</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT: CONSOLE (INDIVIDUAL SCROLL) */}
                <section className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-50/20">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-8 custom-scrollbar justify-center">
                        
                        {/* 01. Professional Input Display */}
                        <div className="bg-black rounded-[2.5rem] p-10 shadow-2xl balance-glow border border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                           
                           <div className="flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em]">Secure Terminal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Sync</span>
                                </div>
                           </div>
                            
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.6em] mb-4 block">Input Nominal</span>
                                <div className="flex items-center justify-between group-within:scale-105 transition-transform">
                                    <span className="text-3xl font-black text-slate-800 italic tracking-widest">IDR</span>
                                    <input 
                                        type="text"
                                        autoFocus
                                        value={paymentAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setPaymentAmount(val);
                                        }}
                                        placeholder="0"
                                        className="bg-transparent text-right text-[5rem] font-black text-white tracking-tighter tabular-nums outline-none w-full placeholder:text-white/5"
                                    />
                                </div>
                            </div>

                            <div className={`py-6 px-8 rounded-3xl flex justify-between items-center border-2 transition-all duration-500 relative z-10 ${Number(paymentAmount) >= remainingBalance ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-500'}`}>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] block mb-1 opacity-50">{Number(paymentAmount) >= remainingBalance ? 'Uang Kembali' : 'Kurang Bayar'}</span>
                                    <span className="text-3xl font-black tabular-nums tracking-tighter italic">Rp {Math.abs(Number(paymentAmount) - remainingBalance).toLocaleString()}</span>
                                </div>
                                {Number(paymentAmount) >= remainingBalance ? <CheckCircle2 className="w-8 h-8 opacity-60" /> : <Calculator className="w-8 h-8 opacity-20" />}
                            </div>
                        </div>

                        {/* 02. Payment Method selection */}
                        <div className="space-y-6 max-w-md mx-auto w-full">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] whitespace-nowrap">Payment Method</h3>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {(settings?.availablePaymentMethods || ['CASH', 'QRIS', 'BCA', 'MEMBERSHIP']).map((m: string) => {
                                    const isSelected = paymentMethod === m.toUpperCase();
                                    return (
                                        <button 
                                            key={m} 
                                            onClick={() => setPaymentMethod(m.toUpperCase())}
                                            className={`h-16 rounded-2xl flex items-center justify-between px-6 transition-all border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-500 hover:text-slate-900 group'}`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">{m}</span>
                                            {isSelected ? <Check className="w-5 h-5" /> : <CreditCard className="w-4 h-4 opacity-10 group-hover:opacity-100 transition-opacity" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Shortcut Buttons */}
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setPaymentAmount(remainingBalance.toString())} className="flex-1 h-12 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg">Uang Pas</button>
                                <button onClick={() => setPaymentAmount((Math.ceil(remainingBalance/10000)*10000).toString())} className="flex-1 h-12 bg-white border-2 border-slate-100 text-slate-900 text-[10px] font-black rounded-xl uppercase tracking-widest hover:border-indigo-500 active:scale-95 transition-all shadow-sm">Bulatkan</button>
                            </div>

                            {/* Action Strip */}
                            <div className="flex flex-col gap-4 pt-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleHoldBill} className="h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:border-slate-900 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all">
                                         <Timer className="w-5 h-5" /> Simpan
                                    </button>
                                    <button onClick={handlePrint} className="h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:border-slate-900 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all">
                                         <Printer className="w-5 h-5" /> Cetak
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    disabled={isSubmitting || !paymentMethod || Number(paymentAmount) < remainingBalance}
                                    className={`w-full h-24 rounded-[2.5rem] font-black text-2xl flex items-center justify-between px-10 transition-all group relative overflow-hidden ${
                                        (isSubmitting || !paymentMethod || Number(paymentAmount) < remainingBalance)
                                        ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 border-b-8 border-indigo-900 shadow-2xl active:scale-95 active:border-b-2'
                                    }`}
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${!paymentMethod || Number(paymentAmount) < remainingBalance ? 'bg-slate-200/50' : 'bg-white/20'}`}>
                                            <Zap className={`w-7 h-7 ${!paymentMethod || Number(paymentAmount) < remainingBalance ? 'opacity-20' : 'text-yellow-400 animate-pulse'}`} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mb-1">Finalize Order</span>
                                            <span className="tracking-tighter uppercase italic text-2xl">LUNASKAN SEKARANG</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-10 h-10 opacity-30 group-hover:translate-x-4 transition-all" />
                                </button>
                            </div>
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
