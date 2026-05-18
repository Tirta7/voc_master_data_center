'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Plus, Trash2, ChevronRight, Receipt,
    CreditCard, DollarSign, User, X, CheckCircle2,
    Calculator, ArrowRight, Printer, AlertCircle,
    Coffee, Utensils, GlassWater, Clock
} from 'lucide-react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { socket } from '@/lib/socket';

import { API_URL } from '@/utils/urlUtils';

interface SplitBillDashboardProps {
    transaction: any;
    settings: any;
    onPaymentSuccess: (updatedTx?: any) => void;
    onClose: () => void;
    initialSelectedItems?: number[];
}

interface Payer {
    id: string;
    name: string;
    selectedItemIds: number[];
    billiardPortion: number | string;
    paymentMethod: string;
    isPaid: boolean;
    paymentId?: number;
}

export default function SplitBillDashboard({ transaction, settings, onPaymentSuccess, onClose, initialSelectedItems }: SplitBillDashboardProps) {
    const { showAlert, showConfirm } = useAlert();
    const { user } = useAuth();
    useBodyScrollLock(true);
    const availableMethods = useMemo(() => {
        return settings?.availablePaymentMethods || ['Cash', 'QRIS'];
    }, [settings]);

    const [payers, setPayers] = useState<Payer[]>([
        { id: 'initial-1', name: 'Payer 1', selectedItemIds: initialSelectedItems || [], billiardPortion: '', paymentMethod: (settings?.availablePaymentMethods?.[0] || 'Cash'), isPaid: false }
    ]);
    const [activePayerId, setActivePayerId] = useState<string>('initial-1');
    const [processing, setProcessing] = useState(false);

    // Track which items are assigned to which payer (local state before submit)
    const assignedItemIds = useMemo(() => {
        return payers.reduce((acc: number[], payer) => [...acc, ...payer.selectedItemIds], []);
    }, [payers]);

    // Filter unpaid items which are NOT yet assigned
    const availableItems = useMemo(() => {
        return (transaction?.orderItems || []).filter((item: any) => !item.isPaid && !assignedItemIds.includes(item.id));
    }, [transaction, assignedItemIds]);

    const addPayer = () => {
        const nextId = `payer-${Date.now()}`;
        setPayers([...payers, {
            id: nextId,
            name: `Payer ${payers.length + 1}`,
            selectedItemIds: [],
            billiardPortion: '',
            paymentMethod: availableMethods[0],
            isPaid: false
        }]);
        setActivePayerId(nextId);
    };

    const removePayer = (id: string) => {
        if (payers.length <= 1) return;
        setPayers(payers.filter(p => p.id !== id));
        if (activePayerId === id) setActivePayerId(payers[0].id);
    };

    const toggleItemToPayer = (itemId: number) => {
        if (activePayer?.isPaid) return;

        const item = (transaction.orderItems || []).find((i: any) => i.id === itemId);
        if (!item) return;

        const itemIdsToToggle = item.bundleGroupId
            ? (transaction.orderItems || []).filter((i: any) => i.bundleGroupId === item.bundleGroupId).map((i: any) => i.id)
            : [itemId];

        // If any item in the group is already assigned to active payer, we remove the whole group (unassign)
        if (activePayer?.selectedItemIds.includes(itemId)) {
            setPayers(payers.map(p =>
                p.id === activePayerId
                    ? { ...p, selectedItemIds: p.selectedItemIds.filter((id: number) => !itemIdsToToggle.includes(id)) }
                    : p
            ));
            return;
        }

        // Check if any item in the group is already assigned to ANOTHER payer
        const otherPayer = payers.find(p => p.id !== activePayerId && itemIdsToToggle.some((id: number) => p.selectedItemIds.includes(id)));
        if (otherPayer) return;

        // Add whole group to active payer
        setPayers(payers.map(p =>
            p.id === activePayerId
                ? { ...p, selectedItemIds: [...p.selectedItemIds, ...itemIdsToToggle] }
                : p
        ));
    };

    const calculatePayerTotal = (payer: Payer) => {
        const itemsSubtotal = (transaction.orderItems || [])
            .filter((item: any) => payer.selectedItemIds.includes(item.id))
            .reduce((sum: number, item: any) => sum + (Number(item.priceAtOrder) * item.quantity), 0);

        const billiardPortionVal = Number(payer.billiardPortion || 0);
        const subtotal = itemsSubtotal + billiardPortionVal;
        const sc = Math.round(subtotal * (Number(settings?.serviceChargePercentage || 0) / 100));
        const vat = Math.round((subtotal + sc) * (Number(settings?.ppnPercentage || 0) / 100));
        const rawTotal = subtotal + sc + vat;
        const kelipatan = Math.max(1, Number(settings?.roundingKelipatan || 1));
        const roundedTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;
        const rounding = roundedTotal - rawTotal;

        // Cap at actual remaining balance to prevent rounding accumulation across multiple payers
        // Logic: If grandTotal from backend is already the "Remaining" balance (common in GET transients),
        // we don't subtract alreadyPaid again. sessionTotals always contains the FULL session total.
        const alreadyPaid = Number(transaction.paidAmount || 0);
        const fullGrandTotal = Number(transaction.sessionTotals?.grandTotal || transaction.grandTotal || 0);
        
        // If sessionTotals exists, we know grandTotal is transient (remaining).
        // If not, we fall back to a heuristic.
        const remainingBalance = transaction.sessionTotals 
            ? Number(transaction.grandTotal || 0) 
            : Math.max(0, fullGrandTotal - alreadyPaid);

        // If this payer's calculated total exceeds remaining, cap it
        // This also handles the case where remainingBalance is 0
        const total = roundedTotal > remainingBalance
            ? remainingBalance
            : roundedTotal;

        // Recalculate rounding based on capped total
        const finalRounding = total - rawTotal;

        return { itemsSubtotal, billiardPortion: billiardPortionVal, sc, vat, total, rounding: Math.max(0, finalRounding) };
    };

    const handleProcessPayment = async (payerId: string) => {
        const payer = payers.find(p => p.id === payerId);
        if (!payer) return;

        const totals = calculatePayerTotal(payer);
        if (totals.total <= 0) {
            showAlert('Peringatan', 'Pilih item atau isi biaya billiard untuk pembayar ini.', { variant: 'warning' });
            return;
        }

        const confirm = await showConfirm(
            `Proses Bayar: ${payer.name}`,
            `Konfirmasi pembayaran sebesar Rp ${totals.total.toLocaleString()} menggunakan ${payer.paymentMethod}?`,
            { confirmLabel: 'Proses Pembayaran' }
        );

        if (confirm) {
            setProcessing(true);
            try {
                const response = await axios.post(`${API_URL}/transactions/${transaction.id}/multi-payer`, {
                    orderItemIds: payer.selectedItemIds,
                    payerName: payer.name,
                    paymentMethod: payer.paymentMethod.toUpperCase(),
                    billiardPortion: payer.billiardPortion,
                    userId: user?.id
                });

                const updatedTx = response.data;
                showAlert('Berhasil', `Pembayaran untuk ${payer.name} berhasil diproses!`, { variant: 'success' });

                // Find the paymentId for this specific payer from the updated transaction
                // Backend returns the full transaction object with populated relations
                const lastPayment = updatedTx.payments && Array.isArray(updatedTx.payments)
                    ? [...updatedTx.payments].sort((a: any, b: any) => b.id - a.id)[0]
                    : null;

                // Update local state to mark as paid and store the payment ID
                setPayers(payers.map(p => p.id === payerId ? {
                    ...p,
                    isPaid: true,
                    paymentId: lastPayment?.id
                } : p));

                onPaymentSuccess(updatedTx);
            } catch (error) {
                console.error('Payment failed:', error);
                showAlert('Gagal', 'Terjadi kesalahan saat memproses pembayaran.', { variant: 'error' });
            } finally {
                setProcessing(false);
            }
        }
    };

    // Real-time Display Sync: Split Bill
    useEffect(() => {
        if (!transaction?.id || !socket.connected) return;

        const currentTableId = transaction.tableId || transaction.cafeTableId;
        if (!currentTableId) return;

        const payersData = payers.map(p => ({
            name: p.name,
            total: calculatePayerTotal(p).total,
            isPaid: p.isPaid,
            isActive: p.id === activePayerId,
            items: (transaction.orderItems || [])
                .filter((item: any) => p.selectedItemIds.includes(item.id))
                .map((item: any) => ({
                    name: item.menuItem?.name || 'Item',
                    qty: item.quantity,
                    price: item.priceAtOrder
                })),
            billiardPortion: p.billiardPortion
        }));

        // Absolute total for the session (doesn't decrease as payments happen)
        const absoluteTotal = transaction.sessionTotals?.grandTotal || transaction.grandTotal;

        console.log('[SplitBill] Emitting state to CFD:', { tableId: currentTableId, payersCount: payersData.length, total: absoluteTotal });
        socket.emit('billing_split_state', {
            tableId: Number(currentTableId),
            payers: payersData,
            activePayer: payers.find(p => p.id === activePayerId)?.name,
            totalBill: absoluteTotal,
            customerName: transaction.customerName || 'Guest'
        });

        // Cleanup: Clear split display when dashboard closes
        return () => {
            socket.emit('billing_split_state', null);
        };
    }, [payers, activePayerId, transaction]);

    const activePayer = payers.find(p => p.id === activePayerId);
    const activeTotals = activePayer ? calculatePayerTotal(activePayer) : null;

    const handlePrintReceipt = async (payerId: string | undefined) => {
        if (!payerId) return;
        const payer = payers.find(p => p.id === payerId);
        if (!payer) return;

        // Try multiple sources for the payment ID
        // 1. Local state (most reliable for just-paid session)
        // 2. Transaction paymentDetails history
        // 3. Transaction payments relation
        let paymentId = payer.paymentId;

        if (!paymentId) {
            const paymentInDtl = (transaction.paymentDetails || []).find((p: any) => p.payer === payer.name);
            paymentId = paymentInDtl?.paymentId;
        }

        if (!paymentId && transaction.payments) {
            const paymentInRel = (transaction.payments || []).find((p: any) => p.payerName === payer.name);
            paymentId = paymentInRel?.id;
        }

        if (!paymentId) {
            showAlert('Peringatan', 'Detail pembayaran tidak ditemukan untuk pembayar ini.', { variant: 'warning' });
            return;
        }

        try {
            await axios.post(`${API_URL}/transactions/payment/${paymentId}/print`, {
                printerIp: settings?.printerMapping?.cashier || '192.168.1.100'
            });
            showAlert('Berhasil', 'Struk sedang dicetak...', { variant: 'success' });
        } catch (error) {
            console.error('Print failed:', error);
            showAlert('Gagal', 'Terjadi kesalahan saat mencetak struk.', { variant: 'error' });
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overscroll-contain">
            <div className="bg-white w-full max-w-6xl h-[98vh] sm:h-[90vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-white overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 bg-slate-100 text-slate-900 flex justify-between items-center relative border-b border-slate-200">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-none mb-1">Split Bill Interaktif</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{transaction?.invoiceNumber} • {transaction?.table?.tableName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 hover:bg-white/10 rounded-full transition-all group"
                    >
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 min-h-0">
                    {/* Left: Item Menu */}
                    <div className="lg:col-span-4 xl:col-span-3 bg-slate-50 border-r border-slate-100 flex flex-col min-h-0 max-h-[40vh] lg:max-h-full overscroll-contain">
                        <div className="p-4 sm:p-6 border-b border-slate-200 bg-white sticky top-0 z-20">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Receipt className="w-3 h-3 text-indigo-600" /> Item Belum Lunas
                                </h3>
                                <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">
                                    {availableItems.length}
                                </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold">Ketik item untuk membagi bill.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                            {availableItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 grayscale">
                                    <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-500" />
                                    <p className="font-black text-slate-500">SEMUA ITEM SUDAH DIALOKASIKAN</p>
                                </div>
                            ) : (() => {
                                const renderedBundleIds = new Set<string>();
                                return availableItems.map((item: any) => {
                                    if (item.bundleGroupId) {
                                        if (renderedBundleIds.has(item.bundleGroupId)) return null;
                                        renderedBundleIds.add(item.bundleGroupId);

                                        // Bundle handling
                                        const bundleItems = (transaction?.orderItems || []).filter((i: any) => i.bundleGroupId === item.bundleGroupId);
                                        const bundleName = bundleItems.find((i: any) => i.customName?.includes('[PAKET]'))?.customName || `Paket: ${item.note?.replace('Bundle: ', '') || 'Promo'}`;
                                        const bundleTotal = bundleItems.reduce((sum: number, i: any) => sum + (Number(i.priceAtOrder) * i.quantity), 0);

                                        return (
                                            <button
                                                key={`bundle-${item.bundleGroupId}`}
                                                disabled={activePayer?.isPaid}
                                                onClick={() => toggleItemToPayer(item.id)}
                                                className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col group bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-sm`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                                            <Coffee className="w-4 h-4 text-white" />
                                                        </div>
                                                        <p className="text-xs font-black uppercase text-slate-900">{bundleName}</p>
                                                    </div>
                                                    <p className="font-black text-indigo-600 text-sm">Rp {bundleTotal.toLocaleString()}</p>
                                                </div>
                                                <div className="space-y-1 pl-11">
                                                    {bundleItems.map((bi: any) => (
                                                        <p key={bi.id} className="text-[10px] font-bold text-slate-400">• {bi.quantity}x {bi.menuItem?.name}</p>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            disabled={activePayer?.isPaid}
                                            onClick={() => toggleItemToPayer(item.id)}
                                            className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden flex justify-between items-center group bg-white border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 shadow-sm`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black bg-slate-100 text-slate-500`}>
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-black uppercase leading-tight text-slate-900`}>{item.menuItem?.name}</p>
                                                    <p className={`text-[10px] font-bold text-slate-400`}>Rp {Number(item.priceAtOrder).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end relative z-10">
                                                <p className={`font-black text-slate-900`}>Rp {(item.quantity * Number(item.priceAtOrder)).toLocaleString()}</p>
                                            </div>
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        {/* Billiard Cost Assignment (Optional per payer) */}
                        <div className="p-4 sm:p-6 bg-indigo-50/50 border-t border-indigo-100 mt-auto sticky bottom-0 z-20">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Biaya Billiard</h3>
                            </div>
                            <div className="mb-4">
                                {(() => {
                                    const alreadyPaidBilliard = (transaction?.payments || []).reduce((sum: number, p: any) => sum + Number(p.billiardPortion || 0), 0);
                                    const assignedToOtherPayers = payers
                                        .filter(p => p.id !== activePayerId)
                                        .reduce((sum, p) => sum + Number(p.billiardPortion || 0), 0);
                                    const totalRemaining = Math.max(0, Number(transaction?.billiardTotal || 0) - alreadyPaidBilliard - assignedToOtherPayers);

                                    return (
                                        <>
                                            <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-tighter">
                                                Sisa: Rp {Math.round(totalRemaining).toLocaleString()}
                                                {alreadyPaidBilliard > 0 && <span className="ml-2 text-indigo-600 opacity-60">(Terbayar: Rp {alreadyPaidBilliard.toLocaleString()})</span>}
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    disabled={activePayer?.isPaid}
                                                    value={activePayer?.billiardPortion}
                                                    onChange={(e) => {
                                                        const rawVal = e.target.value;
                                                        if (rawVal === '') {
                                                            setPayers(payers.map(p => p.id === activePayerId ? { ...p, billiardPortion: '' } : p));
                                                        } else {
                                                            const val = Math.min(totalRemaining, Math.max(0, Number(rawVal)));
                                                            setPayers(payers.map(p => p.id === activePayerId ? { ...p, billiardPortion: val } : p));
                                                        }
                                                    }}
                                                    className="w-full p-3 pl-10 bg-white border-2 border-indigo-100 rounded-xl text-lg font-black focus:ring-4 focus:ring-indigo-100 focus:outline-none placeholder:text-slate-200 transition-all"
                                                    placeholder="0"
                                                />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">Rp</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex gap-2">
                                {[10000, 20000, 50000].map(amt => (
                                    <button
                                        key={amt}
                                        disabled={activePayer?.isPaid}
                                        onClick={() => {
                                            const alreadyPaidBilliard = (transaction?.payments || []).reduce((sum: number, p: any) => sum + Number(p.billiardPortion || 0), 0);
                                            const assignedToOtherPayers = payers
                                                .filter(p => p.id !== activePayerId)
                                                .reduce((sum, p) => sum + Number(p.billiardPortion || 0), 0);
                                            const totalRemaining = Math.max(0, Number(transaction?.billiardTotal || 0) - alreadyPaidBilliard - assignedToOtherPayers);

                                            setPayers(payers.map(p => {
                                                if (p.id === activePayerId) {
                                                    const newVal = Math.min(totalRemaining, Number(p.billiardPortion || 0) + amt);
                                                    return { ...p, billiardPortion: newVal };
                                                }
                                                return p;
                                            }));
                                        }}
                                        className="flex-1 py-1.5 bg-white border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                        + {amt.toLocaleString('id-ID')}
                                    </button>
                                ))}
                                <button
                                    disabled={activePayer?.isPaid}
                                    onClick={() => setPayers(payers.map(p => p.id === activePayerId ? { ...p, billiardPortion: 0 } : p))}
                                    className="px-2 bg-white border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Middle & Right: Payers Workflow */}
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 bg-white">
                        {/* Payer Navbar - STICKY */}
                        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-30">
                            <div className="flex gap-2 items-center overflow-x-auto pb-1 noscrollbar max-w-[60%] sm:max-w-none">
                                {payers.map(payer => (
                                    <button
                                        key={payer.id}
                                        onClick={() => setActivePayerId(payer.id)}
                                        className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2.5 whitespace-nowrap ${activePayerId === payer.id
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                            }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${payer.isPaid ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                        {payer.name}
                                        {payers.length > 1 && !payer.isPaid && (
                                            <X
                                                onClick={(e) => { e.stopPropagation(); removePayer(payer.id); }}
                                                className="w-3 h-3 text-slate-400 hover:text-rose-500"
                                            />
                                        )}
                                    </button>
                                ))}
                                <button
                                    onClick={addPayer}
                                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 border-dashed"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Meja</p>
                                <p className="text-xl font-black text-slate-900 tracking-tighter">Rp {Math.round(transaction?.grandTotal || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Current Payer View */}
                        <div className="flex-1 p-4 sm:p-8 flex flex-col lg:grid lg:grid-cols-2 gap-8 overflow-y-auto min-h-0 noscrollbar overscroll-contain">
                            {/* Payer Details & Items */}
                            <div className="space-y-6 flex flex-col min-h-0">
                                <div className="flex-shrink-0">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nama Pembayar</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            disabled={activePayer?.isPaid}
                                            value={activePayer?.name || ''}
                                            onChange={(e) => setPayers(payers.map(p => p.id === activePayerId ? { ...p, name: e.target.value } : p))}
                                            className="w-full text-xl font-black border-none focus:ring-0 p-0 text-slate-900 placeholder:text-slate-100 selection:bg-indigo-100"
                                            placeholder="Masukkan Nama..."
                                        />
                                        <div className="w-8 h-0.5 bg-indigo-600 mt-1"></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Item Yang Dibayar</label>
                                    <div className="space-y-2 lg:max-h-[300px] overflow-y-auto pr-2 noscrollbar overscroll-contain">
                                        {activePayer?.selectedItemIds.length === 0 && (activePayer?.billiardPortion || 0) === 0 ? (
                                            <div className="h-full min-h-[120px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center p-8 text-center opacity-40">
                                                <Calculator className="w-6 h-6 text-slate-300 mb-2" />
                                                <p className="text-[10px] font-bold text-slate-400 max-w-[120px]">Klik item untuk memasukkan ke bill ini</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(() => {
                                                    const renderedBundleIds = new Set<string>();
                                                    return (transaction.orderItems || [])
                                                        .filter((item: any) => activePayer?.selectedItemIds.includes(item.id))
                                                        .map((item: any) => {
                                                            if (item.bundleGroupId) {
                                                                if (renderedBundleIds.has(item.bundleGroupId)) return null;
                                                                renderedBundleIds.add(item.bundleGroupId);

                                                                const bundleItems = (transaction?.orderItems || []).filter((i: any) => i.bundleGroupId === item.bundleGroupId);
                                                                const bundleName = bundleItems.find((i: any) => i.customName?.includes('[PAKET]'))?.customName || `Paket: Bundle`;
                                                                const bundleTotal = bundleItems.reduce((sum: number, i: any) => sum + (Number(i.priceAtOrder) * i.quantity), 0);

                                                                return (
                                                                    <div key={`assigned-bundle-${item.bundleGroupId}`} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                                                        <button
                                                                            disabled={activePayer?.isPaid}
                                                                            onClick={() => toggleItemToPayer(item.id)}
                                                                            className="w-full flex justify-between items-center p-3.5 hover:bg-rose-50 transition-all group"
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 group-hover:hidden" />
                                                                                <Trash2 className="w-3.5 h-3.5 text-rose-500 hidden group-hover:block" />
                                                                                <span className="text-xs font-black text-slate-700 uppercase group-hover:text-rose-600">{bundleName}</span>
                                                                            </div>
                                                                            <span className="text-xs font-black text-slate-900 group-hover:text-rose-600">Rp {bundleTotal.toLocaleString()}</span>
                                                                        </button>
                                                                        <div className="bg-slate-50/50 px-4 py-2 space-y-1 border-t border-slate-50">
                                                                            {bundleItems.map((bi: any) => (
                                                                                <p key={bi.id} className="text-[9px] font-bold text-slate-400 leading-tight">
                                                                                    {bi.quantity}x {bi.menuItem?.name}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    disabled={activePayer?.isPaid}
                                                                    onClick={() => toggleItemToPayer(item.id)}
                                                                    className="w-full flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-rose-200 hover:bg-rose-50 transition-all group"
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 group-hover:hidden" />
                                                                        <Trash2 className="w-3.5 h-3.5 text-rose-500 hidden group-hover:block" />
                                                                        <span className="text-xs font-black text-slate-700 uppercase group-hover:text-rose-600">{item.menuItem?.name}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400">x{item.quantity}</span>
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-900 group-hover:text-rose-600">Rp {(item.quantity * Number(item.priceAtOrder)).toLocaleString()}</span>
                                                                </button>
                                                            );
                                                        });
                                                })()}
                                                {/* Billiard Portion if exists */}
                                                {Number(activePayer?.billiardPortion || 0) > 0 && (
                                                    <div className="flex justify-between items-center p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                                                        <div className="flex items-center gap-2.5">
                                                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                                            <span className="text-xs font-black text-indigo-600 uppercase">Porsi Billiard</span>
                                                        </div>
                                                        <span className="text-xs font-black text-indigo-600">Rp {Number(activePayer?.billiardPortion).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Summary & Checkout */}
                            <div className="flex flex-col gap-6 lg:sticky lg:top-0">
                                <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl flex flex-col h-full relative overflow-hidden group/card shadow-indigo-900/10">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="flex items-center gap-2.5 mb-6 relative z-10">
                                        <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                                            <Receipt className="w-4 h-4 text-indigo-300" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Billing Summary</p>
                                    </div>
                                    <div className="space-y-3 flex-1 relative z-10">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Items Subtotal</span>
                                            <span className="font-mono text-xs font-black">Rp {activeTotals?.itemsSubtotal.toLocaleString()}</span>
                                        </div>
                                        {activeTotals && activeTotals.billiardPortion > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Billiard Portion</span>
                                                <span className="font-mono text-xs font-black">Rp {activeTotals?.billiardPortion.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">Service Fee <span className="text-[7px] bg-slate-800 px-1 py-0.5 rounded">{settings?.serviceChargePercentage}%</span></span>
                                            <span className="font-mono text-xs font-black">Rp {activeTotals?.sc.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">Pajak PPN <span className="text-[7px] bg-slate-800 px-1 py-0.5 rounded">{settings?.ppnPercentage}%</span></span>
                                            <span className="font-mono text-xs font-black">Rp {activeTotals?.vat.toLocaleString()}</span>
                                        </div>
                                        {activeTotals && activeTotals.rounding > 0 && (
                                            <div className="flex justify-between text-sm border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">
                                                    Pembulatan
                                                    <span className="text-[7px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded">
                                                        per Rp {Number(settings?.roundingKelipatan || 1).toLocaleString()}
                                                    </span>
                                                </span>
                                                <span className="font-mono text-xs font-black text-amber-400">+Rp {activeTotals?.rounding.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {activeTotals && activeTotals.rounding === 0 && (
                                            <div className="border-b border-white/5 pb-3" />
                                        )}
                                        <div className="pt-3 flex justify-between items-center">
                                            <div>
                                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Grand Total</p>
                                                <p className="text-[8px] text-slate-500 font-bold uppercase italic">Sudah termasuk semua biaya</p>
                                            </div>
                                            <p className="text-3xl font-black tracking-tighter">
                                                <span className="text-sm opacity-40 mr-1">Rp</span>
                                                {activeTotals?.total.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Footer Section: Payment Method & Submit */}
                                    <div className="mt-8 space-y-4 relative z-10">
                                        {activePayer?.isPaid ? (
                                            <div className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4 text-emerald-400">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm uppercase">LUNAS</p>
                                                    <p className="text-[10px] font-bold opacity-60">Dibayar via {activePayer.paymentMethod}</p>
                                                </div>
                                                <button
                                                    onClick={() => handlePrintReceipt(activePayer?.id)}
                                                    className="ml-auto p-3 hover:bg-indigo-500 rounded-2xl text-white/40 hover:text-white transition-all group-hover/payer:text-indigo-400 group-hover/payer:hover:text-white"
                                                >
                                                    <Printer className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(() => {
                                                        const baseMethods = (settings?.availablePaymentMethods || []);
                                                        return (transaction?.memberId ? Array.from(new Set(['MEMBERSHIP', ...baseMethods])) : baseMethods).map((m: string) => (
                                                            <button
                                                                key={m}
                                                                onClick={() => setPayers(payers.map(p => p.id === activePayerId ? { ...p, paymentMethod: m } : p))}
                                                                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activePayer?.paymentMethod === m
                                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                                    : m === 'MEMBERSHIP'
                                                                        ? 'bg-white/10 text-emerald-400 border border-emerald-500/30'
                                                                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {m}
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>

                                                <button
                                                    disabled={processing || (activeTotals?.total || 0) <= 0}
                                                    onClick={() => activePayer && handleProcessPayment(activePayer.id)}
                                                    className={`w-full py-6 rounded-[1.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${processing || (activeTotals?.total || 0) <= 0
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-8 ring-indigo-600/10'
                                                        }`}
                                                >
                                                    {processing ? (
                                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <CreditCard className="w-6 h-6" />
                                                            <span>BAYAR STRUK {activePayer?.name.toUpperCase()}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

