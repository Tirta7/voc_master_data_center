"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvoiceService", {
    enumerable: true,
    get: function() {
        return InvoiceService;
    }
});
const _common = require("@nestjs/common");
const _settingsservice = require("../settings/settings.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let InvoiceService = class InvoiceService {
    async generateThermalInvoice(transaction) {
        const settings = await this.settingsService.getSettings();
        const separator = '-'.repeat(32);
        // Centering helper
        const center = (text)=>{
            const spaces = Math.max(0, Math.floor((32 - text.length) / 2));
            return ' '.repeat(spaces) + text;
        };
        const formatDate = (date)=>{
            if (!date) return '-';
            const d = new Date(date);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        };
        const lines = [
            center(settings.businessName.toUpperCase()),
            center(settings.address || ''),
            separator,
            transaction.invoiceNumber,
            `Payment Date : ${formatDate(transaction.updatedAt)}`,
            `Table : ${transaction.table?.tableName || 'N/A'} - ${transaction.sessionType || 'Open'}`,
            `Customer : ${transaction.customerName || 'General'}`,
            `Fare : ${transaction.fareName || 'Open Table'}`,
            `Start : ${formatDate(transaction.startTime)}`,
            `End : ${formatDate(transaction.endTime)}`,
            `Duration : ${transaction.sessionDuration || '-'}`,
            separator
        ];
        // Itemized Cafe Items by Category
        if (transaction.orderItems && transaction.orderItems.length > 0) {
            const processedBundleIds = new Set();
            const categoryOrder = [
                'PROMO',
                'MAKANAN',
                'MINUMAN',
                'SNACK'
            ];
            // Group items by category (include ALL items — paid and unpaid — for full transparency)
            const groups = {};
            transaction.orderItems.forEach((item)=>{
                if (item.status?.toUpperCase() === 'CANCELLED') return; // Skip cancelled items
                let cat = '';
                if (item.bundleGroupId) {
                    cat = 'PROMO';
                } else {
                    const rawCatObj = item.menuItem?.category;
                    const catName = (typeof rawCatObj === 'object' ? rawCatObj?.name : rawCatObj) || 'LAIN-LAIN';
                    const upperCat = catName.toUpperCase();
                    // Localization mapping for common terms
                    if (upperCat === 'FOOD' || upperCat === 'MAKANAN') cat = 'MAKANAN';
                    else if (upperCat === 'DRINK' || upperCat === 'MINUMAN') cat = 'MINUMAN';
                    else if (upperCat === 'SNACK') cat = 'SNACK';
                    else cat = upperCat; // Dynamic category name
                }
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);
            });
            // Iterate through sorted categories first, then the rest
            const allCats = Object.keys(groups);
            const printedCats = new Set();
            const printCategory = (cat)=>{
                const items = groups[cat];
                if (!items || items.length === 0) return;
                lines.push(`[ ${cat} ]`);
                items.forEach((item)=>{
                    if (item.bundleGroupId) {
                        if (processedBundleIds.has(item.bundleGroupId)) return;
                        const bundleItems = transaction.orderItems.filter((i)=>i.bundleGroupId === item.bundleGroupId);
                        const bundleName = bundleItems.find((i)=>i.customName?.includes('[PAKET]'))?.customName || `Paket: ${item.note?.replace('Bundle: ', '') || 'Promo'}`;
                        // Check if this bundle is already paid via wallet
                        const bundlePaid = bundleItems.every((bi)=>bi.isPaid);
                        const bundleTotal = bundleItems.reduce((sum, i)=>sum + Number(i.priceAtOrder) * i.quantity, 0);
                        lines.push(bundleName.toUpperCase());
                        if (bundlePaid) {
                            // Already paid via Member Wallet — show as Rp 0
                            lines.push(`1 x ${bundleTotal.toLocaleString()} [WALLET]         Rp. 0`);
                        } else {
                            const qtyPrice = `1 x ${bundleTotal.toLocaleString()}`;
                            const subtotal = `Rp. ${bundleTotal.toLocaleString()}`;
                            const spaces = 32 - qtyPrice.length - subtotal.length;
                            lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
                        }
                        bundleItems.forEach((bi)=>{
                            lines.push(` - ${bi.quantity}x ${bi.menuItem?.name || 'Item'}`);
                        });
                        processedBundleIds.add(item.bundleGroupId);
                    } else {
                        const name = item.customName || item.menuItem?.name || 'Item';
                        const itemPrice = Number(item.priceAtOrder);
                        const qty = Number(item.quantity);
                        if (item.isPaid) {
                            // Already paid via Member Wallet — show item info but price as Rp 0
                            lines.push(name.toUpperCase() + ' [WALLET]');
                            const qtyStr = `${qty} x ${itemPrice.toLocaleString()}`;
                            lines.push(qtyStr + '                  Rp. 0');
                        } else {
                            // Not yet paid — show normal price
                            lines.push(name.toUpperCase());
                            const qtyPrice = `${qty} x ${itemPrice.toLocaleString()}`;
                            const subtotal = `Rp. ${(itemPrice * qty).toLocaleString()}`;
                            const spaces = 32 - qtyPrice.length - subtotal.length;
                            lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
                        }
                    }
                });
                printedCats.add(cat);
            };
            // 1. Orderly print
            categoryOrder.forEach((cat)=>printCategory(cat));
            // 2. Catch-all for other dynamic categories
            allCats.forEach((cat)=>{
                if (!printedCats.has(cat)) printCategory(cat);
            });
            lines.push(separator);
        }
        // BILLING SEGREGATION: Check if billiard was already paid via member wallet
        const billiardTotal = Number(transaction.billiardTotal || 0);
        const memberBilliardPaid = (transaction.payments || []).filter((p)=>p.paymentMethod === 'MEMBER' && Number(p.billiardPortion) > 0).reduce((sum, p)=>sum + Number(p.billiardPortion), 0);
        const billiardIsPrepaidWallet = memberBilliardPaid >= billiardTotal && billiardTotal > 0;
        if (billiardTotal > 0) {
            if (billiardIsPrepaidWallet) {
                lines.push(`Total Table : Rp. ${billiardTotal.toLocaleString()} [WALLET]`);
            } else {
                lines.push(`Total Table : Rp. ${billiardTotal.toLocaleString()}`);
                // Breakdown segments (matching frontend UI)
                if (Array.isArray(transaction.billingDetails) && transaction.billingDetails.length > 0) {
                    const initial = transaction.billingDetails.filter((seg)=>!seg.isExtension);
                    const extensions = transaction.billingDetails.filter((seg)=>seg.isExtension);
                    // 1. Initial Modes
                    initial.forEach((seg)=>{
                        const durLabel = typeof seg.duration === 'string' ? seg.duration : seg.duration > 0 ? `${seg.duration}m` : '';
                        const rateStr = seg.ratePerHour ? ` @${Number(seg.ratePerHour).toLocaleString()}` : '';
                        const label = `• ${seg.title || 'Mode'} (${durLabel})${rateStr}`;
                        const subtotal = `Rp. ${Number(seg.subtotal || 0).toLocaleString()}`;
                        const spaces = 32 - label.length - subtotal.length;
                        lines.push(label + ' '.repeat(Math.max(1, spaces)) + subtotal);
                    });
                    // 2. Extensions
                    if (extensions.length > 0) {
                        lines.push('EXTEND :');
                        extensions.forEach((seg)=>{
                            const mins = Number(seg.duration || 0);
                            const durLabel = mins % 60 === 0 ? `${mins / 60} Jam (${mins}m)` : `${mins} Menit`;
                            const timeRange = seg.startTimeFormatted && seg.endTimeFormatted ? ` (${seg.startTimeFormatted}-${seg.endTimeFormatted})` : '';
                            const label = `- ${seg.title || 'Extend'} ${durLabel}${timeRange}`;
                            const subtotal = `Rp. ${Number(seg.subtotal || 0).toLocaleString()}`;
                            const spaces = 32 - label.length - subtotal.length;
                            lines.push(label + ' '.repeat(Math.max(1, spaces)) + subtotal);
                        });
                    }
                }
            }
        }
        lines.push(`Rounding : Rp. ${Number(transaction.roundingAmount).toLocaleString()}`, `Discount : Rp. ${Number(transaction.discountAmount || 0).toLocaleString()}`, `PPN : Rp. ${Number(transaction.vatAmount).toLocaleString()}`, `Grand Total : Rp. ${Number(transaction.grandTotal).toLocaleString()}`, separator, ...Number(transaction.paidAmount) > 0 ? [
            `Sudah Dibayar : Rp. ${Number(transaction.paidAmount).toLocaleString()}`,
            `Sisa Tagihan  : Rp. ${Math.max(0, Number(transaction.grandTotal) - Number(transaction.paidAmount)).toLocaleString()}`,
            separator
        ] : [], `Method : ${transaction.paymentDetails?.[transaction.paymentDetails.length - 1]?.method || 'Cash'}`, `Payment Amount : Rp. ${Number(transaction.paidAmount).toLocaleString()}`, `Change Money   : Rp. ${Math.max(0, Number(transaction.paidAmount) - Number(transaction.grandTotal)).toLocaleString()}`, separator, ...transaction.memberId ? [
            `Member : ${transaction.member?.name || 'Member'}`,
            `Poin Transaksi  : +${transaction.awardedPoints || 0}`,
            `Total Poin Anda : ${transaction.member?.points || 0}`,
            separator
        ] : [], `Kasir : ${transaction.createdBy?.name || 'Admin'}`, `Waiter : ${transaction.openedBy?.name || 'System'}`, center('Terima Kasih, Selamat Datang Kembali'), center('Kritik & Saran | Ikuti Kami'), center(`IG: @Info_PadreBilliard`), center(`WA: 0888-6969-5000`));
        return lines.join('\n');
    }
    async generateThermalReceipt(payment, transaction) {
        const settings = await this.settingsService.getSettings();
        const separator = '-'.repeat(32);
        const center = (text)=>{
            const spaces = Math.max(0, Math.floor((32 - text.length) / 2));
            return ' '.repeat(spaces) + text;
        };
        const formatDate = (date)=>{
            if (!date) return '-';
            const d = new Date(date);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        };
        const lines = [
            center(settings.businessName.toUpperCase()),
            center(settings.address || ''),
            separator,
            center('STRUK PEMBAYARAN'),
            `No. Inv : ${transaction.invoiceNumber}`,
            `Pmbayar : ${payment.payerName || 'General'}`,
            `Tanggal : ${formatDate(payment.createdAt)}`,
            `Meja    : ${transaction.table?.tableName || 'N/A'}`,
            ...transaction.memberId ? [
                `Member  : ${transaction.member?.name || 'Member'}`,
                `Poin    : +${transaction.awardedPoints || 0}`
            ] : [],
            separator
        ];
        // Items
        if (payment.itemsSnapshot && Array.isArray(payment.itemsSnapshot)) {
            const processedBundleIds = new Set();
            payment.itemsSnapshot.forEach((item)=>{
                if (item.bundleGroupId) {
                    if (processedBundleIds.has(item.bundleGroupId)) return;
                    const bundleItems = payment.itemsSnapshot.filter((i)=>i.bundleGroupId === item.bundleGroupId);
                    const bundleName = bundleItems.find((i)=>i.displayName?.includes('[PAKET]'))?.displayName || `Paket: Bundle`;
                    const bundleTotal = bundleItems.reduce((sum, i)=>sum + Number(i.subtotal || 0), 0);
                    lines.push(bundleName.toUpperCase());
                    const qtyPrice = `1 x ${bundleTotal.toLocaleString()}`;
                    const subtotalStr = `Rp. ${bundleTotal.toLocaleString()}`;
                    const spaces = 32 - qtyPrice.length - subtotalStr.length;
                    lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotalStr);
                    // List sub-items
                    bundleItems.forEach((bi)=>{
                        const subName = bi.displayName || bi.name || 'Item';
                        lines.push(` - ${bi.qty}x ${subName}`);
                    });
                    processedBundleIds.add(item.bundleGroupId);
                } else {
                    lines.push(`${item.displayName || item.name || 'Item'}`);
                    const price = Number(item.price || 0);
                    const qty = Number(item.qty || 1);
                    const sub = Number(item.subtotal || price * qty);
                    const qtyPrice = `${qty} x ${price.toLocaleString()}`;
                    const subtotalStr = `Rp. ${sub.toLocaleString()}`;
                    const spaces = 32 - qtyPrice.length - subtotalStr.length;
                    lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotalStr);
                }
            });
        }
        if (Number(payment.billiardPortion) > 0) {
            const label = transaction.fareName ? `Billiard (${transaction.fareName})` : 'Billiard Portion';
            const amount = `Rp. ${Number(payment.billiardPortion).toLocaleString()}`;
            const spaces = 32 - label.length - amount.length;
            lines.push(label + ' '.repeat(Math.max(1, spaces)) + amount);
        }
        lines.push(separator);
        const summary = [
            {
                label: 'Subtotal',
                val: Number(payment.itemsSubtotal) + Number(payment.billiardPortion)
            },
            {
                label: 'Service',
                val: payment.serviceAmount
            },
            {
                label: 'PPN',
                val: payment.taxAmount
            },
            {
                label: 'Rounding',
                val: payment.roundingAmount
            }
        ];
        summary.forEach((s)=>{
            if (Number(s.val) !== 0) {
                const spaces = 32 - s.label.length - `Rp. ${Number(s.val).toLocaleString()}`.length;
                lines.push(s.label + ' '.repeat(Math.max(1, spaces)) + `Rp. ${Number(s.val).toLocaleString()}`);
            }
        });
        lines.push(separator);
        const totalLine = `TOTAL : Rp. ${Number(payment.totalPaid).toLocaleString()}`;
        lines.push(center(totalLine));
        lines.push(`Method: ${payment.paymentMethod}`);
        lines.push(separator);
        lines.push(center('Terima Kasih'));
        lines.push(center('Selamat Datang Kembali'));
        return lines.join('\n');
    }
    constructor(settingsService){
        this.settingsService = settingsService;
    }
};
InvoiceService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService
    ])
], InvoiceService);

//# sourceMappingURL=invoice.service.js.map