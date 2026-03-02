'use client';

import React from 'react';

interface ThermalReceiptProps {
    tx: any;
    settings: any;
    isTemporary?: boolean;
    cashierName?: string;
    selectedItemIds?: number[];
    isReprint?: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

export default function ThermalReceipt({ tx, settings, isTemporary, cashierName, selectedItemIds, isReprint }: ThermalReceiptProps) {
    if (!tx || !settings) return null;

    // Headers from settings
    const bizName = (settings.invoiceBusinessName || settings.businessName || 'PENTAGON').toUpperCase();
    const bizAddress = (settings.invoiceAddress || settings.address || 'Jakarta').toUpperCase();
    const bizContact = settings.invoiceContact || settings.contact;
    const bizSocmed = settings.invoiceSocialMedia || settings.socialMediaLink;

    // 1. Filter out CANCELLED orders
    const rawItems = (tx.orderItems || []).filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED');

    // 2. Determine which items to show
    let items = rawItems;
    let isSubset = false;

    // Totals Calculation - PRIORITIZE SESSION TOTALS FOR ACCURATE BILL DISPLAY
    const sessionTotals = (tx as any).sessionTotals || {};

    let currentBilliardPortion = (sessionTotals.billiardTotal !== undefined)
        ? Number(sessionTotals.billiardTotal)
        : Number(tx.billiardTotal || 0);

    // Fallback: If billiardTotal is 0 but billingDetails has entries, sum them up (for very active transient sessions)
    if (currentBilliardPortion === 0 && Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0) {
        currentBilliardPortion = tx.billingDetails.reduce((sum: number, seg: any) => sum + (Number(seg.subtotal || seg.amount || 0)), 0);
    }

    if (isReprint) {
        items = rawItems;
        isSubset = false;
    } else if (selectedItemIds && selectedItemIds.length > 0) {
        // Case A: Explicit Partial Selection
        items = rawItems.filter((i: any) => selectedItemIds.includes(i.id));
        currentBilliardPortion = 0;
        isSubset = true;
    } else {
        items = rawItems;
        isSubset = false;
    }

    // ─── MEMBERSHIP BILLIARD PRE-PAID DETECTION ────────────────────────────
    // Check if billiard was already paid via member wallet (auto-debit at session start or stop)
    const groups: Record<string, any[]> = {};

    items.forEach((item: any) => {
        let groupName = 'LAIN-LAIN';
        const rawCat = item.menuItem?.category;

        if (typeof rawCat === 'object' && rawCat?.name) {
            groupName = rawCat.name;
        } else if (typeof rawCat === 'string' && rawCat) {
            groupName = rawCat;
        }

        const target = groupName.toUpperCase();
        if (!groups[target]) groups[target] = [];
        groups[target].push(item);
    });

    // CALCULATE DERIVED TOTALS FROM RENDERED ITEMS
    const itemsSubtotal = items.reduce((sum: number, i: any) => sum + (Number(i.priceAtOrder || 0) * Number(i.quantity || 0)), 0);

    const getCategoryDiscount = (cfg: any, catName: string) => {
        const categoryUpper = String(catName || 'LAINNYA').trim().toUpperCase();
        let matchedPercent = 0;
        let found = false;
        const configEntries = Object.entries(cfg).sort((a, b) => b[0].length - a[0].length);

        // 1. Exact or bidirectional prefix match
        for (const [k, v] of configEntries) {
            const keyUpper = k.trim().toUpperCase();
            if (keyUpper === categoryUpper || categoryUpper.startsWith(keyUpper) || keyUpper.startsWith(categoryUpper)) {
                matchedPercent = Number(v) || 0;
                found = true;
                break;
            }
        }

        // 2. Fallbacks for common keywords
        if (!found || matchedPercent === 0) {
            if (categoryUpper.includes('MAKAN') || categoryUpper.includes('FOOD')) {
                matchedPercent = Number(cfg.food ?? cfg.other ?? 0);
            } else if (categoryUpper.includes('MINUM') || categoryUpper.includes('DRINK') || categoryUpper.includes('BEVERAGE')) {
                matchedPercent = Number(cfg.drink ?? cfg.other ?? 0);
            } else {
                matchedPercent = Number(cfg.other || 0);
            }
        }
        return matchedPercent;
    };

    // Calculate Total Potential Session Discount (for footers)
    let sessionTotalDiscount = 0;
    if (tx.member?.tier?.discountConfig) {
        const cfg = tx.member.tier.discountConfig as any;

        // 1. Billiard Discount
        const billiardDiscPercent = Number(cfg.billiardOpen || cfg.billiardPackage || 0);
        sessionTotalDiscount += Math.round(currentBilliardPortion * (billiardDiscPercent / 100));

        // 2. Cafe Discounts (all items in session)
        items.forEach((item: any) => {
            // Priority: Use pre-calculated discount from backend
            if (Number(item.discountAmount) > 0) {
                sessionTotalDiscount += Number(item.discountAmount);
            } else {
                // Fallback: Dynamic calculation for legacy items or pending orders
                const catName = typeof item.menuItem?.category === 'object' ? item.menuItem?.category?.name : item.menuItem?.category;
                const percent = getCategoryDiscount(cfg, catName);
                sessionTotalDiscount += Math.round((Number(item.priceAtOrder || 0) * Number(item.quantity || 0)) * (percent / 100));
            }
        });
    }

    // Subtotal (Original price before discounts)
    const itemsSubtotalRaw = items.reduce((sum: number, i: any) => sum + (Number(i.priceAtOrder || 0) * Number(i.quantity || 0)), 0);
    const subtotal = (sessionTotals.billiardTotal !== undefined)
        ? (Number(sessionTotals.billiardTotal) + itemsSubtotalRaw)
        : (itemsSubtotal + currentBilliardPortion);

    const totalDiscount = (sessionTotals.discountAmount !== undefined)
        ? Number(sessionTotals.discountAmount)
        : (isSubset ? 0 : sessionTotalDiscount);

    const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

    const scAmount = (sessionTotals.serviceChargeAmount !== undefined)
        ? Number(sessionTotals.serviceChargeAmount)
        : (isSubset ? Math.round(discountedSubtotal * (Number(settings.serviceChargePercentage || 0) / 100)) : Number(tx.serviceChargeAmount || 0));

    const taxAmount = (sessionTotals.vatAmount !== undefined)
        ? Number(sessionTotals.vatAmount)
        : (isSubset ? Math.round((discountedSubtotal + scAmount) * (Number(settings.ppnPercentage || 0) / 100)) : Number(tx.vatAmount || 0));

    const rawTotal = discountedSubtotal + scAmount + taxAmount;
    const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
    const grandTotal = (sessionTotals.grandTotal !== undefined)
        ? Number(sessionTotals.grandTotal)
        : (isSubset ? (Math.ceil(rawTotal / kelipatan) * kelipatan) : Number(tx.grandTotal || 0));

    const rounding = (sessionTotals.roundingAmount !== undefined)
        ? Number(sessionTotals.roundingAmount)
        : (isSubset ? (grandTotal - rawTotal) : Number(tx.roundingAmount || 0));

    const paid = isSubset ? grandTotal : Number(tx.paidAmount || 0);
    const latestPmtRecord = (tx.paymentDetails && tx.paymentDetails?.length > 0) ? tx.paymentDetails[tx.paymentDetails.length - 1] : null;
    const method = (isSubset && latestPmtRecord) ? latestPmtRecord.method : (isReprint ? (tx.paymentDetails?.[(tx.paymentDetails?.length || 0) - 1]?.method || 'TUNAI') : (tx.paymentDetails?.[0]?.method || (tx.payments?.[0]?.paymentMethod) || 'TUNAI'));

    const tDate = new Date(tx.updatedAt || tx.createdAt).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const tTime = new Date(tx.updatedAt || tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

    // Determine cashier: Priority to prop (active shift), then transaction data, then settings
    const displayCashier = (cashierName || tx.createdBy?.name || settings.posWaitName || 'ADMIN').toUpperCase();

    // Billiard Session Times
    const startTime = tx.startTime || tx.table?.startTime || tx.createdAt;
    const endTime = tx.endTime || tx.table?.endTime || tx.updatedAt || new Date();

    const formatTime = (date: any) => {
        if (!date) return '--.--';
        return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '.');
    };

    const calculateDuration = (start: any, end: any) => {
        if (!start || !end) return '0 Hour : 0 Minute : 0 Second';
        const diff = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h} Hour : ${m} Minute : ${String(s).padStart(2, '0')} Second`;
    };

    const displayDuration = tx.sessionDuration && tx.sessionDuration !== '0 Hour : 0 Minute : 0 Second'
        ? tx.sessionDuration
        : calculateDuration(startTime, endTime);

    // Payer mapping for items
    const payerMap: Record<number, string> = {};
    if (tx.payments && Array.isArray(tx.payments)) {
        tx.payments.forEach((p: any) => {
            if (p.id && p.payerName) payerMap[p.id] = p.payerName;
        });
    } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
        tx.paymentDetails.forEach((p: any) => {
            if (p.paymentId && p.payer) payerMap[p.paymentId] = p.payer;
        });
    }

    return (
        <div className="receipt-container mx-auto">
            <style jsx>{`
                .receipt-container {
                    font-family: 'Courier New', Courier, monospace;
                    width: 76mm;
                    max-width: 100%;
                    background: white;
                    padding: 0mm 4mm 10mm 4mm;
                    line-height: 1.2;
                    color: black;
                    box-sizing: border-box;
                    margin: 0 auto;
                    font-weight: 600;
                }
                
                .dashed-line {
                    border-top: 1px dashed black;
                    margin: 4px 0;
                    width: 100%;
                }

                .dual-dashed-line {
                    border-top: 1px dashed black;
                    border-bottom: 1px dashed black;
                    height: 3px;
                    margin: 4px 0;
                    width: 100%;
                }

                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                    .receipt-container {
                        width: 76mm;
                        padding: 0mm 2mm 1mm 2mm !important;
                        margin: 0 auto !important;
                        border: none !important;
                    }
                }
            `}</style>

            {/* Header Branding */}
            <div className="text-center mb-1">
                <p className="font-bold text-[22px] tracking-[0.1em]">{bizName}</p>
                <p className="text-[10px] leading-tight mb-0.5">{bizAddress}</p>
                <p className="text-[10px] leading-tight flex justify-center gap-4">
                    <span>CS:{bizContact || '-'}</span>
                    <span>IG:{bizSocmed || ''}</span>
                </p>
                <div className="dashed-line mt-1"></div>
            </div>

            {/* Meta Info Section */}
            <div className="text-[11px] mb-2 space-y-0.5">
                <div className="text-center mt-1 mb-1">
                    <p className="font-bold text-[10.5px] leading-tight tracking-[0.05em]">NO. INVOICE</p>
                    <p className="font-bold text-[12px] leading-none">{tx.invoiceNumber}</p>
                </div>
                <div className="text-center">
                    <p className="font-bold">Tanggal: {tDate}, {tTime}</p>
                </div>
                <div className="dashed-line"></div>

                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 items-baseline px-1">
                    <span>Customer:</span>
                    <span className="font-bold text-right truncate">{(tx.customerName || '-').toUpperCase()}</span>
                    <span className="pl-3"></span>
                    <span className="font-bold text-right">
                        {(tx.table?.tableName || tx.cafeTable?.tableName || (tx.tableId ? `BILLIARD-${tx.tableId}` : (tx.cafeTableId ? `CAFE-${tx.cafeTableId}` : 'W-IN'))).toUpperCase()}
                    </span>
                </div>

                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 items-baseline px-1">
                    <span>Kasir:</span>
                    <span className="font-bold text-right truncate">{displayCashier}</span>
                    <span className="pl-3">Waiters:</span>
                    <span className="font-bold text-right truncate">{(tx.openedBy?.name || 'SYSTEM').toUpperCase()}</span>
                </div>
                {tx.member && (
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 items-baseline px-1 text-[10px]">
                        <span>Membership:</span>
                        <div className="text-right">
                            <span className="font-black underline">{(tx.member.tier?.name || 'REGULER').toUpperCase()}</span>
                            <p className="text-[9px] opacity-70">ID: {tx.member.memberCode}</p>
                        </div>
                    </div>
                )}
                <div className="dashed-line"></div>
            </div>

            {/* Table Header */}
            <div className="flex justify-between text-[11px] font-bold mb-1 px-1">
                <span className="w-40 text-left">ITEM</span>
                <span className="w-10 text-center">QTY</span>
                <span className="flex-1 text-right">JUMLAH</span>
            </div>
            <div className="dashed-line mt-0"></div>

            {/* ── Billiard Session ── */}
            {(currentBilliardPortion > 0 || tx.type === 'BILLIARD' || tx.tableId) && (
                <div className="text-[11px] mb-2 px-1">
                    <p className="font-black mb-1 text-[12px]">BILLIARD :</p>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black pl-2">MODE : {String(tx.fareName || 'Open Table').toUpperCase()}</p>
                        <p className="font-black text-[11px] pl-2">{displayDuration}</p>



                        <div className="space-y-0.5 text-[11px] pl-2">
                            <div className="flex justify-between">
                                <span>START: {startTime ? new Date(startTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '--/--/--'}</span>
                                <span className="font-black">{formatTime(startTime)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>END : {endTime ? new Date(endTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '--/--/--'}</span>
                                <span className="font-black">{formatTime(endTime)}</span>
                            </div>
                        </div>

                        {/* Billing breakdown segments */}
                        <div className="mt-1 space-y-1 pl-4 border-l border-slate-100 ml-2">
                            {Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0 ? (
                                tx.billingDetails.map((seg: any, i: number) => {
                                    const durLabel = typeof seg.duration === 'string'
                                        ? seg.duration
                                        : (seg.duration > 0 ? `${seg.duration}m` : '');

                                    // Use slot title (e.g., 10:00-17:00) as the range label if available
                                    // Otherwise fallback to startTimeFormatted-endTimeFormatted
                                    const slotRange = (seg.title || '').includes('-')
                                        ? seg.title.replace(/:/g, '.')
                                        : `${(seg.startTimeFormatted || '').replace(/:/g, '.').split('.').slice(0, 2).join('.')}-${(seg.endTimeFormatted || '').replace(/:/g, '.').split('.').slice(0, 2).join('.')}`;

                                    const rateStr = seg.ratePerHour ? ` @Rp${fmt(seg.ratePerHour)}` : '';
                                    const label = `•(${durLabel}) ${slotRange}${rateStr}`;

                                    return (
                                        <div key={i} className="flex justify-between text-[11px] items-baseline">
                                            <span className="font-bold flex-1 pr-2">{label}</span>
                                            <span className="font-black text-right min-w-[80px]">Rp{fmt(seg.subtotal || seg.amount || 0)}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex justify-between text-[11px]">
                                    <span className="font-black">{String(tx.fareName || 'OPEN TABLE').toUpperCase()}</span>
                                    <span className="font-black text-right">Rp{fmt(currentBilliardPortion)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PAID via member wallet badge - REMOVED so it flows to Grand Total instead */}
                    <div className="dashed-line mt-1"></div>
                    {/* Inline Billiard Discount Calculation */}
                    {(() => {
                        let billiardDiscPercent = 0;
                        if (tx.member?.tier?.discountConfig) {
                            const cfg = tx.member.tier.discountConfig as any;
                            billiardDiscPercent = Number(cfg.billiardOpen || cfg.billiardPackage || 0);
                        }
                        const billiardDiscVal = Math.round(currentBilliardPortion * (billiardDiscPercent / 100));

                        // Only show the summary block if there's a discount or if segments are empty
                        const showSummary = billiardDiscPercent > 0 || !Array.isArray(tx.billingDetails) || tx.billingDetails.length === 0;

                        if (!showSummary) return null;

                        return (
                            <div className="text-[11px] px-1 space-y-0.5 mt-1 border-t border-slate-100 pt-1 font-bold">
                                {(!Array.isArray(tx.billingDetails) || tx.billingDetails.length === 0) && (
                                    <div className="flex justify-between">
                                        <span>Subtotal Billiard</span>
                                        <span>Rp{fmt(currentBilliardPortion)}</span>
                                    </div>
                                )}
                                {billiardDiscPercent > 0 && (
                                    <div className="flex justify-between">
                                        <span>Disc {tx.member?.tier?.name} ({billiardDiscPercent}%)</span>
                                        <span>-Rp{fmt(billiardDiscVal)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="dashed-line"></div>
                </div>
            )}

            {/* ── Topup Section ── */}
            {tx.type === 'TOPUP' && (
                <div className="text-[11px] mb-2 px-1">
                    <div className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px]">
                        <span className="leading-tight">TOP SALDO</span>
                        <span className="text-center">1</span>
                        <span className="text-right font-bold min-w-[70px]">Rp{fmt(tx.grandTotal)}</span>
                    </div>
                    {tx.paymentDetails?.[0]?.method && (
                        <div className="flex justify-between text-[9px] text-gray-500 mt-0.5 pl-1">
                            <span>Metode Pembayaran</span>
                            <span className="font-bold uppercase">{tx.paymentDetails[0].method}</span>
                        </div>
                    )}
                    <div className="dashed-line mt-1"></div>
                </div>
            )}

            {/* ── Cafe Items grouped by category ── */}
            <div className="space-y-1">
                {Object.entries(groups).map(([label, catItems]) => {
                    if (catItems.length === 0) return null;
                    return (
                        <div key={label} className="mb-1">
                            <p className="font-bold text-[11px] mb-0.5">{label} :</p>
                            <div className="space-y-0.5">
                                {catItems.map((item: any, i: number) => {
                                    const isBundle = item.bundleGroupId || item.isBundle;
                                    const origTotal = item.priceAtOrder * item.quantity;

                                    // Determine tier discount for this item
                                    let itemDiscPercent = 0;
                                    let discVal = 0;

                                    if (Number(item.discountAmount) > 0) {
                                        // Priority: Persistent backend data
                                        discVal = Number(item.discountAmount);
                                        itemDiscPercent = Number(item.discountPercentage);
                                    } else if (tx.member?.tier?.discountConfig) {
                                        // Fallback: Dynamic matching
                                        const cfg = tx.member.tier.discountConfig as any;
                                        const catName = typeof item.menuItem?.category === 'object' ? item.menuItem?.category?.name : item.menuItem?.category;
                                        itemDiscPercent = getCategoryDiscount(cfg, catName);
                                        discVal = Math.round(origTotal * (itemDiscPercent / 100));
                                    }
                                    const netTotal = origTotal - discVal;

                                    return (
                                        <div key={i} className="mb-1">
                                            <div className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px] px-1">
                                                <span className="leading-tight">
                                                    {isBundle ? `[PAKET] ` : ''}
                                                    {(item.customName || item.menuItem?.name || 'ITEM').toUpperCase()}
                                                    {item.isPaid && (
                                                        <span className="ml-1 text-[8px] font-black border border-slate-900 px-1 rounded italic"> [LUNAS] </span>
                                                    )}
                                                    {item.paymentId && payerMap[item.paymentId] && (
                                                        <span className="block text-[8px] font-bold text-slate-500 italic">
                                                            [BY: {payerMap[item.paymentId].toUpperCase()}]
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-center">{item.quantity}</span>
                                                <span className="text-right font-bold min-w-[70px]">
                                                    Rp{fmt(origTotal)}
                                                </span>
                                            </div>
                                            {itemDiscPercent > 0 && (
                                                <div className="text-[9px] font-bold text-slate-800 pr-1 text-right mt-0.5">
                                                    Disc {tx.member?.tier?.name} ({itemDiscPercent}%): -Rp{fmt(discVal)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="dashed-line"></div>

            {/* ── Totals Section ── */}
            <div className="text-[11px] font-bold space-y-1 px-1 mt-1">
                <div className="flex justify-between text-[12px] font-black">
                    <span>SUBTOTAL</span>
                    <span>Rp{fmt(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                    <div className="flex justify-between text-slate-800 font-bold">
                        <span>POTONGAN ({(tx.member?.tier?.name || 'MEMBER').toUpperCase()})</span>
                        <span>-Rp{fmt(totalDiscount)}</span>
                    </div>
                )}
                {scAmount > 0 && (
                    <div className="flex justify-between">
                        <span>SERVICE CHARGE ({Number(settings.serviceChargePercentage || 0)}%)</span>
                        <span>Rp{fmt(scAmount)}</span>
                    </div>
                )}
                {taxAmount > 0 && (
                    <div className="flex justify-between">
                        <span>PPN / VAT ({Number(settings.ppnPercentage || 0)}%)</span>
                        <span>Rp{fmt(taxAmount)}</span>
                    </div>
                )}
                {rounding !== 0 && (
                    <div className="flex justify-between italic text-slate-600">
                        <span>PEMBULATAN NOMINAL</span>
                        <span>Rp{fmt(rounding)}</span>
                    </div>
                )}

                <div className="dual-dashed-line border-b-2"></div>
                <div className="flex justify-between text-[14px] font-black py-0.5">
                    <span>GRAND TOTAL</span>
                    <span>Rp{fmt(grandTotal)}</span>
                </div>
                <div className="dashed-line"></div>
            </div>

            {/* ── Payment Detail ── */}
            <div className="text-[10px] font-bold mt-2 px-1">
                <div className="space-y-0.5">
                    <div className="flex justify-between items-center text-[10px]">
                        <span>METODE PEMBAYARAN</span>
                        <span className="font-black">
                            {['MEMBER', 'MEMBERSHIP'].includes(method?.toUpperCase()) ? 'SALDO MEMBER (DEBET)' : method?.toUpperCase() || 'TUNAI'}
                        </span>
                    </div>
                </div>

                {/* History of payments handled by backend sessionTotals if wanted, or transaction records */}
                {tx.paymentDetails && tx.paymentDetails.length > 1 && (
                    <div className="mt-2 space-y-1">
                        <div className="dual-dashed-line"></div>
                        <p className="text-center font-black text-[11px] mb-1">RIWAYAT PEMBAYARAN</p>
                        {tx.paymentDetails.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[9px]">
                                <span>
                                    {new Date(p.timestamp || tx.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}
                                    {' '}[{(p.method || '').toUpperCase()}]{p.payer ? ` - ${p.payer.toUpperCase()}` : ''}
                                </span>
                                <span className="font-black">Rp{fmt(p.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {tx.member && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="flex justify-between font-black text-[11px]">
                            <span>SISA SALDO MEMBER</span>
                            <span>Rp{fmt(tx.member.balance)}</span>
                        </div>
                        {tx.member.tier?.name && (
                            <p className="text-[9px] text-right opacity-80 tracking-widest font-black uppercase">
                                {tx.member.tier.name} • {tx.member.memberCode}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer Branding ── */}
            <div className="text-center text-[11px] mt-6 space-y-4">
                <p className="font-black text-[11px]">{settings.invoiceFooterNote || 'TERIMA KASIH ATAS KUNJUNGAN ANDA'}</p>
                <div className="text-[8px] leading-tight uppercase font-black pt-4 border-t border-slate-100 italic">
                    SYSTEM AND CLOUD POWERED BY<br />
                    VOC_BILLING BILLIARD & CAFE
                </div>
            </div>
        </div>
    );
}
