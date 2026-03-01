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
    let currentBilliardPortion = Number(tx.billiardTotal || 0);
    let isSubset = false;

    if (isReprint) {
        items = rawItems;
        currentBilliardPortion = Number(tx.billiardTotal || 0);
        isSubset = false;
    } else if (selectedItemIds && selectedItemIds.length > 0) {
        // Case A: Explicit Partial Selection
        items = rawItems.filter((i: any) => selectedItemIds.includes(i.id));
        currentBilliardPortion = 0;
        isSubset = true;
    } else {
        items = rawItems;
        currentBilliardPortion = Number(tx.billiardTotal || 0);
        isSubset = false;
    }

    // ─── MEMBERSHIP BILLIARD PRE-PAID DETECTION ────────────────────────────
    // Check if billiard was already paid via member wallet (auto-debit at session start or stop)
    const memberBilliardPayments = (tx.payments || []).filter(
        (p: any) => (p.paymentMethod === 'MEMBER' || p.paymentMethod === 'MEMBERSHIP') && Number(p.billiardPortion || 0) > 0
    );
    const memberBilliardPaid = memberBilliardPayments.reduce(
        (sum: number, p: any) => sum + Number(p.billiardPortion || 0), 0
    );
    // Also check paymentDetails array (legacy format)
    const legacyBilliardPaid = (tx.paymentDetails || [])
        .filter((p: any) => (p.method === 'MEMBER' || p.method === 'MEMBERSHIP') && Number(p.billiardPortion || 0) > 0)
        .reduce((sum: number, p: any) => sum + Number(p.billiardPortion || 0), 0);
    const totalBilliardPaidViaWallet = Math.max(memberBilliardPaid, legacyBilliardPaid);
    const isBilliardPaidViaMember = !isSubset && totalBilliardPaidViaWallet > 0 && currentBilliardPortion > 0;

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

    // For totals: if billiard is pre-paid, it should NOT contribute to what's shown as still-due
    // The backend grandTotal already accounts for this via effectiveBilliardTotal
    const billiardTotalForDisplay = isBilliardPaidViaMember ? 0 : currentBilliardPortion;
    const subtotal = itemsSubtotal + billiardTotalForDisplay;

    // 3. Totals Calculation
    // For non-subset: use backend-provided values (most accurate — already accounts for pre-paid billiard)
    const totalDiscount = isSubset ? 0 : Number(tx.discountAmount || 0);

    const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

    const scAmount = isSubset
        ? Math.round(discountedSubtotal * (Number(settings.serviceChargePercentage || 0) / 100))
        : Number(tx.serviceChargeAmount || 0);
    const taxAmount = isSubset
        ? Math.round((discountedSubtotal + scAmount) * (Number(settings.ppnPercentage || 0) / 100))
        : Number(tx.vatAmount || 0);

    const rawTotal = discountedSubtotal + scAmount + taxAmount;
    const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
    const grandTotal = isSubset
        ? (Math.ceil(rawTotal / kelipatan) * kelipatan)
        : Number(tx.grandTotal || 0);
    const rounding = isSubset ? (grandTotal - rawTotal) : Number(tx.roundingAmount || 0);

    const paid = isSubset ? grandTotal : Number(tx.paidAmount || 0);
    const latestPmtRecord = (tx.paymentDetails && tx.paymentDetails.length > 0) ? tx.paymentDetails[tx.paymentDetails.length - 1] : null;
    const method = (isSubset && latestPmtRecord) ? latestPmtRecord.method : (isReprint ? (tx.paymentDetails?.[tx.paymentDetails.length - 1]?.method || 'TUNAI') : (tx.paymentDetails?.[0]?.method || (tx.payments?.[0]?.paymentMethod) || 'TUNAI'));

    const tDate = new Date(tx.updatedAt || tx.createdAt).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const tTime = new Date(tx.updatedAt || tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

    // Determine cashier: Priority to prop (active shift), then transaction data, then settings
    const displayCashier = (cashierName || tx.createdBy?.name || settings.posWaitName || 'ADMIN').toUpperCase();

    // Billiard Session Times
    const startTime = tx.startTime || tx.table?.startTime;
    const endTime = tx.endTime || tx.table?.endTime || (isTemporary ? new Date() : null);

    const formatTime = (date: any) => {
        if (!date) return '--.--';
        return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '.');
    };

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
            {currentBilliardPortion > 0 && (
                <div className="text-[11px] mb-2">
                    <p className="font-bold mb-0.5">BILLIARD :</p>
                    <div className="pl-2 space-y-0.5">
                        <p className="text-[10px]">MODE : {tx.fareName || 'Open Table'}</p>
                        <p className="font-bold text-[11px]">{tx.sessionDuration || '0 Hour : 0 Minute : 0 Second'}</p>
                        <div className="flex justify-between text-[10px]">
                            <span>START: {new Date(startTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' })}</span>
                            <span>{formatTime(startTime)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span>END  : {new Date(endTime).toLocaleDateString('id-ID', { year: '2-digit', month: '2-digit', day: '2-digit' })}</span>
                            <span>{formatTime(endTime)}</span>
                        </div>

                        {/* Billing breakdown segments */}
                        {!isBilliardPaidViaMember && (
                            <div className="mt-1 space-y-0.5 border-l-2 border-slate-100 pl-3">
                                {Array.isArray(tx.billingDetails) && tx.billingDetails.map((seg: any, i: number) => {
                                    // duration may be "HH:MM:SS" string or numeric minutes
                                    const durLabel = typeof seg.duration === 'string'
                                        ? seg.duration
                                        : (seg.duration > 0 ? `${seg.duration}m` : '');
                                    return (
                                        <div key={i} className="flex justify-between text-[10px] opacity-90">
                                            <span>
                                                {seg.title ? `${seg.title} ` : ''}
                                                {seg.startTimeFormatted && seg.endTimeFormatted
                                                    ? `(${seg.startTimeFormatted}–${seg.endTimeFormatted})`
                                                    : durLabel ? `(${durLabel})` : ''}
                                            </span>
                                            <span>Rp{fmt(seg.subtotal || seg.amount || 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* PAID via member wallet badge */}
                        {isBilliardPaidViaMember && (
                            <div className="mt-1 border border-dashed border-slate-400 rounded px-2 py-1">
                                <p className="text-[9px] font-black text-center tracking-widest">
                                    ✓ LUNAS via SALDO MEMBER
                                </p>
                                <p className="text-[9px] text-center opacity-70">
                                    Rp{fmt(totalBilliardPaidViaWallet)} telah didebet saat sesi dimulai
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="dashed-line mt-1"></div>
                    <div className="flex justify-between font-bold text-[12px] px-1">
                        <span>TOTAL BILLIARD</span>
                        {isBilliardPaidViaMember ? (
                            <span className="flex items-center gap-2">
                                <span className="line-through opacity-40 text-[10px]">Rp{fmt(currentBilliardPortion)}</span>
                                <span>Rp0</span>
                            </span>
                        ) : (
                            <span>Rp{fmt(currentBilliardPortion)}</span>
                        )}
                    </div>
                    <div className="dashed-line"></div>
                </div>
            )}

            {/* ── Topup Section ── */}
            {tx.type === 'TOPUP' && (
                <div className="text-[11px] mb-2 px-1">
                    <div className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px]">
                        <span className="leading-tight">TOPSALDO</span>
                        <span className="text-center">1</span>
                        <span className="text-right font-bold min-w-[70px]">Rp{fmt(tx.grandTotal)}</span>
                    </div>
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
                                    return (
                                        <div key={i} className="grid grid-cols-[1fr_25px_auto] gap-x-2 items-start text-[10px] px-1">
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
                                            <span className="text-right font-bold min-w-[70px]">Rp{fmt(item.priceAtOrder * item.quantity)}</span>
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
            <div className="text-[11px] font-bold space-y-1 px-1">
                <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>Rp{fmt(subtotal)}</span>
                </div>
                {/* If billiard was pre-paid via wallet, show it as a credit line */}
                {isBilliardPaidViaMember && (
                    <div className="flex justify-between text-[10px]">
                        <span>BILLIARD (LUNAS-SALDO)</span>
                        <span>-Rp{fmt(totalBilliardPaidViaWallet)}</span>
                    </div>
                )}
                {totalDiscount > 0 && (() => {
                    const memberTier = tx.member?.tier;
                    const discountConfig = memberTier?.discountConfig;

                    // If we have config, we can show proportional breakdown
                    // Otherwise just show the total discount
                    if (discountConfig) {
                        const billiardDiscPercent = Number(discountConfig.billiardOpen || discountConfig.billiardPackage || 0);
                        const foodDiscPercent = Number(discountConfig.food || 0);
                        const drinkDiscPercent = Number(discountConfig.drink || 0);
                        const otherDiscPercent = Number(discountConfig.other || 0);

                        // Calculate original values before discount
                        // Note: currentBilliardPortion is already discounted if it comes from the backend
                        // But for display we want to show what it would have been
                        const billiardOrig = billiardDiscPercent > 0 ? Math.round(currentBilliardPortion / (1 - billiardDiscPercent / 100)) : currentBilliardPortion;

                        // For items, we need to group them by category to show the breakdown
                        const foodTotal = items.filter((i: any) => i.menuItem?.category?.name?.toUpperCase() === 'FOOD' || i.menuItem?.category === 'FOOD').reduce((sum: number, i: any) => sum + (i.priceAtOrder * i.quantity), 0);
                        const drinkTotal = items.filter((i: any) => i.menuItem?.category?.name?.toUpperCase() === 'DRINK' || i.menuItem?.category === 'DRINK').reduce((sum: number, i: any) => sum + (i.priceAtOrder * i.quantity), 0);
                        const otherTotal = itemsSubtotal - foodTotal - drinkTotal;

                        const foodOrig = foodDiscPercent > 0 ? Math.round(foodTotal / (1 - foodDiscPercent / 100)) : foodTotal;
                        const drinkOrig = drinkDiscPercent > 0 ? Math.round(drinkTotal / (1 - drinkDiscPercent / 100)) : drinkTotal;
                        const otherOrig = otherDiscPercent > 0 ? Math.round(otherTotal / (1 - otherDiscPercent / 100)) : otherTotal;

                        return (
                            <div className="space-y-0.5 border-y border-dashed border-slate-200 py-1 my-1">
                                <p className="text-[10px] font-black mb-1 italic">RINCIAN POTONGAN {memberTier.name}:</p>
                                {billiardDiscPercent > 0 && currentBilliardPortion > 0 && (
                                    <div className="flex justify-between text-[9px]">
                                        <span>BILLIARD (Disc {billiardDiscPercent}%)</span>
                                        <span>Rp{fmt(billiardOrig)} {'->'} Rp{fmt(currentBilliardPortion)}</span>
                                    </div>
                                )}
                                {foodDiscPercent > 0 && foodTotal > 0 && (
                                    <div className="flex justify-between text-[9px]">
                                        <span>FOOD (Disc {foodDiscPercent}%)</span>
                                        <span>Rp{fmt(foodOrig)} {'->'} Rp{fmt(foodTotal)}</span>
                                    </div>
                                )}
                                {drinkDiscPercent > 0 && drinkTotal > 0 && (
                                    <div className="flex justify-between text-[9px]">
                                        <span>DRINK (Disc {drinkDiscPercent}%)</span>
                                        <span>Rp{fmt(drinkOrig)} {'->'} Rp{fmt(drinkTotal)}</span>
                                    </div>
                                )}
                                {otherDiscPercent > 0 && otherTotal > 0 && (
                                    <div className="flex justify-between text-[9px]">
                                        <span>LAINNYA (Disc {otherDiscPercent}%)</span>
                                        <span>Rp{fmt(otherOrig)} {'->'} Rp{fmt(otherTotal)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-black pt-1 border-t border-dotted border-slate-300">
                                    <span>TOTAL POTONGAN</span>
                                    <span>-Rp{fmt(totalDiscount)}</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="flex justify-between">
                            <span>POTONGAN MEMBER/PROMO</span>
                            <span>-Rp{fmt(totalDiscount)}</span>
                        </div>
                    );
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
                    <div className="flex justify-between">
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
                {/* Show payment section only when NOT a full pre-paid member session with Rp 0 remaining */}
                {(!isBilliardPaidViaMember || items.length > 0 || grandTotal > 0) && (
                    <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                            <span>METODE PEMBAYARAN</span>
                            <span className="font-black">[{method.toUpperCase()}]</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>TERIMA</span>
                            <span className="font-black">Rp{fmt(paid)}</span>
                        </div>
                    </div>
                )}

                {/* If fully paid via member wallet and no cafe items: show special note */}
                {isBilliardPaidViaMember && grandTotal === 0 && items.length === 0 && (
                    <div className="mt-1 text-center border border-dashed border-slate-300 rounded p-1">
                        <p className="text-[9px] font-black tracking-widest">✓ LUNAS OTOMATIS via SALDO MEMBER</p>
                    </div>
                )}

                {tx.paymentDetails && tx.paymentDetails.length > 1 && (
                    <div className="mt-2 space-y-1">
                        <div className="dual-dashed-line"></div>
                        <p className="text-center font-black text-[11px] mb-1">RIWAYAT PEMBAYARAN</p>
                        {tx.paymentDetails.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[9px]">
                                <span>
                                    {new Date(p.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}
                                    {' '}[{(p.method || '').toUpperCase()}]{p.payer ? ` - ${p.payer.toUpperCase()}` : ''}
                                </span>
                                <span className="font-black">Rp{fmt(p.amount)}</span>
                            </div>
                        ))}
                        <div className="dashed-line"></div>
                        <div className="flex justify-between font-black text-[10px]">
                            <span>TOTAL DITERIMA</span>
                            <span>Rp{fmt(tx.paidAmount)}</span>
                        </div>
                    </div>
                )}
                {tx.member && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="flex justify-between font-black text-[11px]">
                            <span>SISA SALDO MEMBER</span>
                            <span>Rp{fmt(tx.member.balance)}</span>
                        </div>
                        {tx.member.tier?.name && (
                            <p className="text-[9px] text-right opacity-60 tracking-widest">{(tx.member.tier.name).toUpperCase()} &bull; {tx.member.memberCode}</p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer Branding ── */}
            <div className="text-center text-[11px] mt-6 space-y-2">
                <p className="font-bold">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
                <div className="text-[8px] leading-tight uppercase opacity-80 pt-2 border-t border-slate-100">
                    SYSTEM AND CLOUD POWERED BY<br />
                    VOC_SOFTWARE_ENGINEERING
                </div>
            </div>
        </div >
    );
}
