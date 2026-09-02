'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ThermalReceiptProps {
    tx: any;
    settings: any;
    isTemporary?: boolean;
    cashierName?: string;
    selectedItemIds?: number[];
    isReprint?: boolean;
    paymentMethodOverride?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

export default function ThermalReceipt({ tx, settings, isTemporary, cashierName, selectedItemIds, isReprint, paymentMethodOverride }: ThermalReceiptProps) {
    if (!tx || !settings) return null;

    const isBirthday = (birthDateStr: any, targetDateStr: any) => {
        if (!birthDateStr) return false;
        const birth = new Date(birthDateStr);
        const target = targetDateStr ? new Date(targetDateStr) : new Date();
        return birth.getDate() === target.getDate() && birth.getMonth() === target.getMonth();
    };

    const isBirthdayToday = tx.member?.birthDate && isBirthday(tx.member.birthDate, tx.createdAt);
    const birthdayPct = Number(tx.member?.tier?.birthdayDiscountPct || 0);
    const useBirthdayDiscount = isBirthdayToday && birthdayPct > 0;

    // Headers from settings
    const bizName = (settings.invoiceBusinessName || settings.businessName || 'PENTAGON').toUpperCase();
    const bizAddress = (settings.invoiceAddress || settings.address || 'Jakarta').toUpperCase();
    const bizContact = settings.invoiceContact || settings.contact;
    const bizSocmed = settings.invoiceSocialMedia || settings.socialMediaLink;

    // 1. Filter out CANCELLED orders
    const rawItems = (tx.orderItems || []).filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED' && i.status?.toUpperCase() !== 'CANCEL_REQUESTED');

    // 2. Determine which items to show
    let items = rawItems;
    let isSubset = false;

    // Totals Calculation - PRIORITIZE SESSION TOTALS FOR ACCURATE BILL DISPLAY
    const sessionTotals = (tx as any).sessionTotals || {};

    let currentBilliardPortion = (sessionTotals.billiardTotal !== undefined)
        ? Number(sessionTotals.billiardTotal)
        : Number(tx.billiardTotal || 0);

    // Fallback/Force-sync: Use segments if they sum to more than the reported total (ensures consistency for multi-day sessions)
    const segmentsSum = Array.isArray(tx.billingDetails) ? tx.billingDetails.reduce((sum: number, seg: any) => sum + (Number(seg.subtotal || seg.amount || 0)), 0) : 0;
    if (segmentsSum > currentBilliardPortion) {
        currentBilliardPortion = segmentsSum;
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
    const bundleChildren: Record<string, any[]> = {};
    const topLevelItems: any[] = [];

    // 1. Separate bundle children from top-level items (Headers or Standalone)
    items.forEach((item: any) => {
        const isChild = !!item.bundleGroupId && Number(item.priceAtOrder || 0) === 0;
        if (isChild) {
            const gid = item.bundleGroupId as string;
            if (!bundleChildren[gid]) bundleChildren[gid] = [];
            bundleChildren[gid].push(item);
        } else {
            topLevelItems.push(item);
        }
    });

    // 2. Group only top-level items by category
    topLevelItems.forEach((item: any) => {
        let groupName = 'LAIN-LAIN';
        if (item.bundleGroupId) {
            groupName = 'PROMO';
        } else if (Number(item.priceAtOrder || 0) === 0) {
            groupName = 'PROMO / BONUS';
        } else {
            const rawCat = item.menuItem?.category;
            if (typeof rawCat === 'object' && rawCat?.name) {
                groupName = rawCat.name;
            } else if (typeof rawCat === 'string' && rawCat) {
                groupName = rawCat;
            }
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
        const billiardDiscPercent = useBirthdayDiscount
            ? birthdayPct
            : Number(cfg.billiardOpen || cfg.billiardPackage || 0);
        sessionTotalDiscount += Math.round(currentBilliardPortion * (billiardDiscPercent / 100));

        // 2. Cafe Discounts (all items in session)
        items.forEach((item: any) => {
            // Priority: Use pre-calculated discount from backend
            if (Number(item.discountAmount) > 0) {
                sessionTotalDiscount += Number(item.discountAmount);
            } else {
                // Fallback: Dynamic calculation for legacy items or pending orders
                const catName = typeof item.menuItem?.category === 'object' ? item.menuItem?.category?.name : item.menuItem?.category;
                const percent = useBirthdayDiscount
                    ? birthdayPct
                    : getCategoryDiscount(cfg, catName);
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
        : (isSubset ? 0 : Number(tx.discountAmount || sessionTotalDiscount));

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

    const vchDisc = Number(tx.voucherDiscountAmount || 0);
    let originalGrandTotal = grandTotal;
    if (tx.voucherCode && vchDisc > 0) {
        const originalDiscVal = Math.max(0, totalDiscount - vchDisc);
        const originalDiscountedSubtotal = Math.max(0, subtotal - originalDiscVal);
        const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
        const vatPercent = Number(settings.ppnPercentage || 0) / 100;
        
        const originalScAmount = Math.round(originalDiscountedSubtotal * scPercent);
        const originalTaxAmount = Math.round((originalDiscountedSubtotal + originalScAmount) * vatPercent);
        const originalRawTotal = originalDiscountedSubtotal + originalScAmount + originalTaxAmount;
        const originalKelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
        originalGrandTotal = Math.ceil(originalRawTotal / originalKelipatan) * originalKelipatan;
    }

    const rounding = (sessionTotals.roundingAmount !== undefined)
        ? Number(sessionTotals.roundingAmount)
        : (isSubset ? (grandTotal - rawTotal) : Number(tx.roundingAmount || 0));

    const paid = isSubset ? grandTotal : Number(tx.paidAmount || 0);
    const latestPmtRecord = (tx.paymentDetails && tx.paymentDetails?.length > 0) ? tx.paymentDetails[tx.paymentDetails.length - 1] : null;
    const method = paymentMethodOverride || ((isSubset && latestPmtRecord) ? latestPmtRecord.method : (isReprint ? (tx.paymentDetails?.[(tx.paymentDetails?.length || 0) - 1]?.method || 'TUNAI') : (tx.paymentDetails?.[0]?.method || (tx.payments?.[0]?.paymentMethod) || 'TUNAI')));

    const tDate = new Date(tx.updatedAt || tx.createdAt).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const tTime = new Date(tx.updatedAt || tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

    // Determine cashier: Priority to prop (active shift), then transaction data, then settings
    const displayCashier = (cashierName || tx.createdBy?.name || settings.posWaitName || 'ADMIN').toUpperCase();

    // Billiard Session Times
    const startTime = tx.startTime || tx.table?.startTime || tx.createdAt;
    // Detect ongoing open session: No persisted endTime AND no prepaid endTime AND it's a billiard transaction/table
    const isOngoing = !tx.endTime && !tx.table?.endTime && (tx.tableId || tx.type === 'BILLIARD');
    const endTime = isOngoing ? null : (tx.endTime || tx.table?.endTime || tx.updatedAt || new Date());

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
        : (isOngoing ? calculateDuration(startTime, new Date()) : calculateDuration(startTime, endTime));

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

    const pWidth = Number(settings.printerWidth || 80);
    const containerWidth = pWidth === 58 ? '48mm' : (pWidth === 75 ? '64mm' : '72mm');
    const fontSizeBase = pWidth === 58 ? '9px' : '11px';
    const headerSize = pWidth === 58 ? '18px' : '22px';

    const itemsDetailStr = items.map((i: any) => `- ${(i.customName || i.menuItem?.name || 'ITEM').toUpperCase()} (${Number(i.quantity)}x)${isTemporary ? (i.isPaid ? ' [LUNAS]' : ' [PENDING]') : ''}`).join('\n');

    return (
        <div className="receipt-container mx-auto">
            <style jsx>{`
                .receipt-container {
                    font-family: 'Consolas', 'Lucida Console', 'Monaco', 'Courier New', monospace;
                    width: ${containerWidth};
                    max-width: 100%;
                    background: white;
                    padding: 5mm ${pWidth === 58 ? '2mm' : '4mm'} 10mm ${pWidth === 58 ? '2mm' : '4mm'};
                    line-height: 1.1;
                    color: black;
                    box-sizing: border-box;
                    margin: 0 !important;
                    font-weight: 700;
                    font-size: ${fontSizeBase};
                    letter-spacing: -0.3px;
                    -webkit-font-smoothing: none;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: optimizeLegibility;
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
                        size: ${pWidth}mm auto;
                    }
                    *, *::before, *::after {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                    .receipt-container {
                        width: ${containerWidth};
                        padding: 5mm 2mm 1mm 0mm !important;
                        margin: 0 !important;
                        border: none !important;
                        /* Thermal printer = continuous roll paper, NO page breaks */
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-before: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .receipt-container * {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
                
                .reprint-watermark {
                    border: 2px solid black;
                    padding: 4px 8px;
                    font-size: 20px;
                    font-weight: 900;
                    text-align: center;
                    margin: 10px 0;
                    opacity: 0.8;
                }
                
                .temporary-watermark {
                    border: 2px dashed black;
                    padding: 6px;
                    font-size: 16px;
                    font-weight: 900;
                    text-align: center;
                    margin: 10px 0;
                    line-height: 1.2;
                }
            `}</style>

            {isReprint && (
                <div className="reprint-watermark">
                    REPRINT / SALINAN
                </div>
            )}

            {isTemporary && (
                <div className="temporary-watermark">
                    *** NOTA SEMENTARA ***<br />
                    BUKAN BUKTI BAYAR SAH
                </div>
            )}

            {/* Header Branding */}
            <div className="text-center mb-1">
                <p className="font-bold tracking-[0.1em]" style={{ fontSize: headerSize }}>{bizName}</p>
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
                    <span className="font-bold text-right truncate">
                        {/* Tampilkan customer name, hindari default STANDALONE 'Customer' jika ada data lebih baik */}
                        {(tx.customerName && tx.customerName.toUpperCase() !== 'CUSTOMER'
                            ? tx.customerName
                            : (tx.member?.name || tx.customerName || '-')).toUpperCase()}
                    </span>
                    <span className="pl-3"></span>
                    <span className="font-bold text-right">
                        {/* Prioritas: nama table dari relasi, lalu fallback ke ID */}
                        {(tx.table?.tableName || tx.cafeTable?.tableName
                            || (tx.tableId ? `MEJA ${tx.tableId}` : (tx.cafeTableId ? `MEJA CAFE-${tx.cafeTableId}` : 'WALK-IN'))).toUpperCase()}
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
                    <p className="font-black mb-1 text-[12px]">RENTAL STATION :</p>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black pl-2">MODE : {String(tx.fareName || 'Open Table').toUpperCase()}</p>
                        <p className="font-black text-[11px] pl-2">{displayDuration}</p>



                        <div className="space-y-0.5 text-[11px] pl-2">
                            <div className="flex justify-between">
                                <span>START: {startTime ? new Date(startTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '--/--/--'}</span>
                                <span className="font-black">{formatTime(startTime)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>END : {isOngoing ? <span className="text-indigo-600 animate-pulse">(BERJALAN)</span> : (endTime ? new Date(endTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '--/--/--')}</span>
                                <span className="font-black">{isOngoing ? '... : ...' : formatTime(endTime)}</span>
                            </div>
                        </div>

                        {/* Billing breakdown segments */}
                        <div className="mt-1 space-y-1 pl-4 border-l border-slate-100 ml-2">
                            {Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0 ? (
                                (() => {
                                    const initial = tx.billingDetails.filter((seg: any) => !seg.isExtension);
                                    const extensions = tx.billingDetails.filter((seg: any) => seg.isExtension);

                                    return (
                                        <>
                                            {/* 1. Initial Mode(s) */}
                                            {initial.map((seg: any, i: number) => {
                                                const durLabel = typeof seg.duration === 'string'
                                                    ? seg.duration
                                                    : (seg.duration > 0 ? `${seg.duration}m` : '');

                                                const startTime = seg.startTimeFormatted || '';
                                                const isRunning = !seg.endTimeFormatted && tx.status !== 'PAID';
                                                const timeRange = startTime ? ` (${startTime}${isRunning ? '-...' : ''})` : '';

                                                const rateStr = seg.ratePerHour ? ` @Rp${fmt(seg.ratePerHour)}` : '';
                                                const label = `• ${seg.title || 'Mode'} (${durLabel})${timeRange}${rateStr}`;

                                                return (
                                                    <div key={`init-${i}`} className="flex justify-between text-[11px] items-baseline">
                                                        <span className="font-bold flex-1 pr-2 uppercase">{label}</span>
                                                        <span className="font-black text-right min-w-[80px]">Rp{fmt(seg.subtotal || seg.amount || 0)}</span>
                                                    </div>
                                                );
                                            })}

                                            {/* 2. Extensions Section */}
                                            {extensions.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="font-black text-[11px] uppercase tracking-wider">EXTEND :</p>
                                                    {extensions.map((seg: any, i: number) => {
                                                        const mins = Number(seg.duration || 0);
                                                        const durLabel = mins % 60 === 0
                                                            ? `${mins / 60} Jam (${mins}m)`
                                                            : `${mins} Menit`;

                                                        const timeRange = (seg.startTimeFormatted && seg.endTimeFormatted)
                                                            ? ` (${seg.startTimeFormatted}-${seg.endTimeFormatted})`
                                                            : '';

                                                        // Format: - [Title] [Duration] [TimeRange]
                                                        const label = `- ${seg.title || 'Extend'} ${durLabel}${timeRange}`;

                                                        return (
                                                            <div key={`ext-${i}`} className="flex justify-between text-[11px] items-baseline pl-1">
                                                                <span className="font-bold flex-1 pr-2 uppercase">{label}</span>
                                                                <span className="font-black text-right min-w-[80px]">Rp{fmt(seg.subtotal || seg.amount || 0)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()
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
                            billiardDiscPercent = useBirthdayDiscount
                                ? birthdayPct
                                : Number(cfg.billiardOpen || cfg.billiardPackage || 0);
                        }
                        const billiardDiscVal = Math.round(currentBilliardPortion * (billiardDiscPercent / 100));

                        // Only show the summary block if there's a discount or if segments are empty
                        const showSummary = billiardDiscPercent > 0 || !Array.isArray(tx.billingDetails) || tx.billingDetails.length === 0;

                        if (!showSummary) return null;

                        return (
                            <div className="text-[11px] px-1 space-y-0.5 mt-1 border-t border-slate-100 pt-1 font-bold">
                                {(!Array.isArray(tx.billingDetails) || tx.billingDetails.length === 0) && (
                                    <div className="flex justify-between">
                                        <span>Subtotal Sesi</span>
                                        <span>Rp{fmt(currentBilliardPortion)}</span>
                                    </div>
                                )}
                                {billiardDiscPercent > 0 && (
                                    <div className="flex justify-between">
                                        <span>{useBirthdayDiscount ? 'Disc Birthday' : `Disc ${tx.member?.tier?.name}`} ({billiardDiscPercent}%)</span>
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

                                    // Children lookup
                                    const children = item.bundleGroupId ? (bundleChildren[item.bundleGroupId] || []) : [];

                                    // Determine tier discount
                                    let itemDiscPercent = 0;
                                    let discVal = 0;

                                    let isPromoCoret = false;

                                    if (Number(item.discountAmount) > 0) {
                                        discVal = Number(item.discountAmount) * Number(item.quantity || 1); // Total discount for this row
                                        itemDiscPercent = Number(item.discountPercentage) || 0;
                                        if (itemDiscPercent === 0) {
                                            isPromoCoret = true;
                                        }
                                    } else if (tx.member?.tier?.discountConfig) {
                                        const cfg = tx.member.tier.discountConfig as any;
                                        const catName = typeof item.menuItem?.category === 'object' ? item.menuItem?.category?.name : item.menuItem?.category;
                                        itemDiscPercent = useBirthdayDiscount
                                            ? birthdayPct
                                            : getCategoryDiscount(cfg, catName);
                                        discVal = Math.round(origTotal * (itemDiscPercent / 100));
                                    }

                                    return (
                                        <React.Fragment key={i}>
                                            <div className="mb-1">
                                                <div className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px] px-1">
                                                    <span className="leading-tight">
                                                        {isBundle && !((item.customName || item.menuItem?.name || '').toUpperCase().includes('[PAKET]')) ? `[PAKET] ` : ''}
                                                        {(item.customName || item.menuItem?.name || 'ITEM').toUpperCase()}
                                                        {isTemporary && (item.isPaid ? ' [LUNAS]' : ' [PENDING]')}
                                                    </span>
                                                    <span className="text-center">{Number(item.quantity)}</span>
                                                    <span className="text-right font-bold min-w-[70px]">
                                                        {isPromoCoret ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[9px] line-through text-slate-500 font-normal">Rp{fmt(origTotal)}</span>
                                                                <span>Rp{fmt(origTotal - discVal)}</span>
                                                            </div>
                                                        ) : (
                                                            `Rp${fmt(origTotal)}`
                                                        )}
                                                    </span>
                                                </div>
                                                {discVal > 0 && !isPromoCoret && (
                                                    <div className="text-[9px] font-bold text-slate-800 pr-1 text-right mt-0.5">
                                                        {itemDiscPercent > 0 ? (useBirthdayDiscount ? 'Disc Birthday' : `Disc ${tx.member?.tier?.name || 'Member'}`) : 'Disc Promo'} {itemDiscPercent > 0 ? `(${itemDiscPercent}%)` : ''}: -Rp{fmt(discVal)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Render Children immediately below Header */}
                                            {children.map((child: any, idx: number) => {
                                                const childTotal = child.priceAtOrder * child.quantity;
                                                return (
                                                    <div key={`child-${idx}`} className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px] px-1 mb-0.5">
                                                        <span className="pl-4 block opacity-80 italic leading-tight">
                                                            - {(child.customName || child.menuItem?.name || 'ITEM').toUpperCase()}
                                                            {isTemporary && (child.isPaid ? ' [LUNAS]' : ' [PENDING]')}
                                                        </span>
                                                        <span className="text-center">{Number(child.quantity)}</span>
                                                        <span className="text-right font-bold min-w-[70px]">
                                                            {childTotal > 0 ? `Rp${fmt(childTotal)}` : ''}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
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
                {tx.voucherCode && Number(tx.voucherDiscountAmount) > 0 && (
                    <div className="flex justify-between text-slate-800 font-bold">
                        <span>VOUCHER: {tx.voucherCode.toUpperCase()}</span>
                        <span>-Rp{fmt(Number(tx.voucherDiscountAmount))}</span>
                    </div>
                )}
                {(() => {
                    const pkgDisc = 0; // Discount is now baked into billiardTotal per-slot
                    const elements = [];

                    const remainingDisc = totalDiscount - Number(tx.voucherDiscountAmount || 0) - pkgDisc;
                    if (remainingDisc > 0) {
                        elements.push(
                            <div key="member-disc" className="flex justify-between text-slate-800 font-bold">
                                <span>DISC {tx.member ? (useBirthdayDiscount ? 'BIRTHDAY' : (tx.member?.tier?.name || 'MEMBER').toUpperCase()) : 'PROMO'}</span>
                                <span>-Rp{fmt(remainingDisc)}</span>
                            </div>
                        );
                    }
                    
                    return elements;
                })()}
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
                {tx.voucherCode && Number(tx.voucherDiscountAmount) > 0 && (
                    <div className="text-[9px] text-center italic text-slate-500 mt-1 mb-1 leading-tight">
                        *Harga asli sebelum voucher: Rp{fmt(originalGrandTotal)}
                    </div>
                )}
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
                    <div className="mt-2 pt-2 border-t border-slate-300 border-dashed">
                        <div className="flex justify-between font-black text-[11px] mb-0.5">
                            <span>SISA SALDO Rp</span>
                            <span>Rp{fmt(tx.member.balance)}</span>
                        </div>
                        <div className="flex justify-between font-black text-[11px] mb-0.5">
                            <span>SISA POIN REWARD</span>
                            <span>{fmt(tx.member.points || 0)} Pts</span>
                        </div>
                        {(() => {
                            const rate = Number(settings?.royaltyPointsPerAmount) || 50000;
                            const earned = Math.floor(grandTotal / rate);
                            if (earned > 0 && tx.status === 'PAID') {
                                return (
                                    <div className="flex justify-between font-bold text-[9px] text-slate-800 italic">
                                        <span>(+ Poin Transaksi Ini)</span>
                                        <span>{earned} Pts</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        {tx.member.tier?.name && (
                            <p className="text-[9px] text-right opacity-80 tracking-widest font-black uppercase mt-1">
                                {tx.member.tier.name} • {tx.member.memberCode}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Security QR & Footer Branding ── */}
            <div className="text-center text-[11px] mt-4 space-y-2">
                <div className="flex flex-col items-center gap-1 mb-2">
                    <div className="bg-white p-1 border border-slate-200">
                        <QRCodeSVG
                            value={isTemporary ?
                                `⚠️ NOTA SEMENTARA ⚠️\n` +
                                `===========================\n` +
                                `BUKAN BUKTI BAYAR SAH\n` +
                                `---------------------------\n` +
                                `🧾 INV  : ${tx.invoiceNumber}\n` +
                                `📅 TGL  : ${tDate} ${tTime}\n` +
                                `🎱 MEJA : ${(tx.table?.tableName || tx.cafeTable?.tableName || '-').toUpperCase()}\n` +
                                `👤 CUST : ${(tx.customerName || '-').toUpperCase()}\n` +
                                `🤵 WAITERS : ${(tx.openedBy?.name || 'SYSTEM').toUpperCase()}\n` +
                                `---------------------------\n` +
                                `⏱ START : ${formatTime(startTime)}\n` +
                                `⏱ END   : ${formatTime(endTime)}\n` +
                                `⌛ DUR   : ${displayDuration}\n` +
                                `---------------------------\n` +
                                `🍔 ITEMS:\n` +
                                `${itemsDetailStr}\n` +
                                `💰 TOTAL : Rp${fmt(grandTotal)}\n` +
                                `👤 KASIR : ${displayCashier}\n` +
                                `---------------------------\n` +
                                `Transaksi ini belum diselesaikan di sistem.\n` +
                                `===========================` :
                                `💎 ${bizName} 💎\n` +
                                `===========================\n` +
                                `🧾 INV  : ${tx.invoiceNumber}\n` +
                                `📅 TGL  : ${tDate} ${tTime}\n` +
                                `🎱 MEJA : ${(tx.table?.tableName || tx.cafeTable?.tableName || '-').toUpperCase()}\n` +
                                `👤 CUST : ${(tx.customerName || '-').toUpperCase()}\n` +
                                `🤵 WAITERS : ${(tx.openedBy?.name || 'SYSTEM').toUpperCase()}\n` +
                                `---------------------------\n` +
                                `⏱ START : ${formatTime(startTime)}\n` +
                                `⏱ END   : ${formatTime(endTime)}\n` +
                                `⌛ DUR   : ${displayDuration}\n` +
                                `---------------------------\n` +
                                `🍔 ITEMS:\n` +
                                `${itemsDetailStr}\n` +
                                `💰 TOTAL : Rp${fmt(grandTotal)}\n` +
                                `👤 KASIR : ${displayCashier}\n` +
                                `---------------------------\n` +
                                `✅ VALIDATED BY SYSTEM\n` +
                                `🛡 SECURE TRANSACTION\n` +
                                `===========================`}
                            size={pWidth === 58 ? 120 : 160}
                            level="M"
                            includeMargin={true}
                        />
                    </div>
                    <p className="text-[7px] font-black uppercase tracking-tighter leading-tight opacity-70">
                        {isTemporary ? "⚠️ NOTA SEMENTARA - BUKAN BUKTI BAYAR SAH ⚠️" : "SCAN QR UNTUK VERIFIKASI KEASLIAN NOTA"}
                    </p>
                </div>

                {tx.generatedBounceBackCode && (() => {
                    let bCode = tx.generatedBounceBackCode;
                    let bMinTx = 0;
                    let bExpiry = 'H+14';
                    let bName = 'HADIAH SPESIAL Anda!';
                    let bInstruction = '';
                    
                    if (bCode.includes('|')) {
                        const parts = bCode.split('|');
                        bCode = parts[0];
                        bMinTx = Number(parts[1]);
                        bExpiry = parts[2];
                        if (parts.length > 3) bName = parts[3];
                        if (parts.length > 4) bInstruction = parts[4];
                    }
                    return (
                        <div className="my-3 border-y border-dashed border-slate-400 py-2">
                            <p className="font-black text-[12px] uppercase mb-1">*** BOUNCE-BACK PROMO ***</p>
                            <p className="font-bold text-[9px] leading-tight mb-1">
                                Bawa struk ini pada kunjungan berikutnya<br/>untuk menikmati HADIAH SPESIAL Anda!
                            </p>
                            <p className="font-black text-[12px] mt-1">Kode Klaim: {bCode}</p>
                            {bInstruction ? (
                                <p className="font-bold text-[8px] italic">(Tunjukkan ke kasir <span className="uppercase text-slate-800 font-black">{bInstruction}</span>)</p>
                            ) : (
                                <p className="font-bold text-[8px] italic">(Tunjukkan ke kasir)</p>
                            )}
                            <p className="font-bold text-[8px] italic">(Berlaku s/d {bExpiry})</p>
                            {bMinTx > 0 && (
                                <p className="font-bold text-[8px] italic mt-0.5">(Min. Transaksi Rp {fmt(bMinTx)})</p>
                            )}
                        </div>
                    );
                })()}

                <p className="font-black text-[10px] mb-2">{settings.invoiceFooterNote || 'TERIMA KASIH ATAS KUNJUNGAN ANDA'}</p>

                <div className="mt-6 pt-4 border-t border-dashed border-slate-400 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-[7px] font-black tracking-[0.2em] whitespace-nowrap opacity-50">
                        VOC BILLIARD & CAFE SYSTEM
                    </div>

                    <p className="text-[9px] font-black tracking-widest leading-none mb-1 opacity-80">
                        POWERED BY VOC BILLIARD & CAFE
                    </p>
                    <p className="text-[7px] font-bold leading-tight opacity-60 uppercase">
                        Solusi Manajemen Station Terintegrasi IoT<br />
                        Automasi Meja • Billing Real-time • AI Analytics<br />
                        Info Kerjasama:<br /> 
                        IG: @voc_billiard_management | WA: 08-9999-64538
                    </p>
                </div>
            </div>
        </div>
    );
}
