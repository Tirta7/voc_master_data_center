import { Injectable } from '@nestjs/common';
import { Transaction } from './entities/transaction.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class InvoiceService {
    constructor(private readonly settingsService: SettingsService) { }

    async generateThermalInvoice(transaction: Transaction): Promise<string> {
        const settings = await this.settingsService.getSettings();
        const separator = '-'.repeat(32);

        // Centering helper
        const center = (text: string) => {
            const spaces = Math.max(0, Math.floor((32 - text.length) / 2));
            return ' '.repeat(spaces) + text;
        };

        const formatDate = (date: Date) => {
            if (!date) return '-';
            const d = new Date(date);
            return d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + ' ' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0') + ':' +
                String(d.getSeconds()).padStart(2, '0');
        };

        const lines: string[] = [
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
            separator,
        ];

        // Itemized Cafe Items by Category
        if (transaction.orderItems && transaction.orderItems.length > 0) {
            const processedBundleIds = new Set<string>();
            const categoryOrder = ['PROMO', 'MAKANAN', 'MINUMAN', 'SNACK'];

            // Group items
            const groups: Record<string, any[]> = {};
            transaction.orderItems.forEach(item => {
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
            const printedCats = new Set<string>();

            const printCategory = (cat: string) => {
                const items = groups[cat];
                if (!items || items.length === 0) return;

                lines.push(`[ ${cat} ]`);

                items.forEach(item => {
                    if (item.bundleGroupId) {
                        if (processedBundleIds.has(item.bundleGroupId)) return;

                        const bundleItems = transaction.orderItems.filter(i => i.bundleGroupId === item.bundleGroupId);
                        const bundleName = bundleItems.find(i => i.customName?.includes('[PAKET]'))?.customName || `Paket: ${item.note?.replace('Bundle: ', '') || 'Promo'}`;
                        const bundleTotal = bundleItems.reduce((sum, i) => sum + (Number(i.priceAtOrder) * i.quantity), 0);

                        lines.push(bundleName.toUpperCase());
                        const qtyPrice = `1 x ${bundleTotal.toLocaleString()}`;
                        const subtotal = `Rp. ${bundleTotal.toLocaleString()}`;
                        const spaces = 32 - qtyPrice.length - subtotal.length;
                        lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);

                        bundleItems.forEach(bi => {
                            lines.push(` - ${bi.quantity}x ${bi.menuItem?.name || 'Item'}`);
                        });

                        processedBundleIds.add(item.bundleGroupId);
                    } else {
                        const name = item.customName || item.menuItem?.name || 'Item';
                        lines.push(name.toUpperCase());
                        const qtyPrice = `${item.quantity} x ${Number(item.priceAtOrder).toLocaleString()}`;
                        const subtotal = `Rp. ${(Number(item.priceAtOrder) * item.quantity).toLocaleString()}`;
                        const spaces = 32 - qtyPrice.length - subtotal.length;
                        lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotal);
                    }
                });
                printedCats.add(cat);
            };

            // 1. Orderly print
            categoryOrder.forEach(cat => printCategory(cat));

            // 2. Catch-all for other dynamic categories
            allCats.forEach(cat => {
                if (!printedCats.has(cat)) printCategory(cat);
            });

            lines.push(separator);
        }

        lines.push(
            `Total Table : Rp. ${Number(transaction.billiardTotal).toLocaleString()}`,
            `Rounding : Rp. ${Number(transaction.roundingAmount).toLocaleString()}`,
            `Discount : Rp. 0`,
            `PPN : Rp. ${Number(transaction.vatAmount).toLocaleString()}`,
            `Grand Total : Rp. ${Number(transaction.grandTotal).toLocaleString()}`,
            separator,
            ...(Number(transaction.paidAmount) > 0 ? [
                `Sudah Dibayar : Rp. ${Number(transaction.paidAmount).toLocaleString()}`,
                `Sisa Tagihan  : Rp. ${Math.max(0, Number(transaction.grandTotal) - Number(transaction.paidAmount)).toLocaleString()}`,
                separator
            ] : []),
            `Method : ${transaction.paymentDetails?.[transaction.paymentDetails.length - 1]?.method || 'Cash'}`,
            `Payment Amount : Rp. ${Number(transaction.paidAmount).toLocaleString()}`,
            `Change Money   : Rp. ${Math.max(0, Number(transaction.paidAmount) - Number(transaction.grandTotal)).toLocaleString()}`,
            separator,
            `Kasir : ${transaction.createdBy?.name || 'Admin'}`,
            `Waiter : ${transaction.openedBy?.name || 'System'}`,
            center('Terima Kasih, Selamat Datang Kembali'),
            center('Kritik \u0026 Saran | Ikuti Kami'),
            center(`IG: @Info_PadreBilliard`),
            center(`WA: 0888-6969-5000`),
        );

        return lines.join('\n');
    }

    async generateThermalReceipt(payment: any, transaction: Transaction): Promise<string> {
        const settings = await this.settingsService.getSettings();
        const separator = '-'.repeat(32);

        const center = (text: string) => {
            const spaces = Math.max(0, Math.floor((32 - text.length) / 2));
            return ' '.repeat(spaces) + text;
        };

        const formatDate = (date: Date) => {
            if (!date) return '-';
            const d = new Date(date);
            return d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + ' ' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0') + ':' +
                String(d.getSeconds()).padStart(2, '0');
        };

        const lines: string[] = [
            center(settings.businessName.toUpperCase()),
            center(settings.address || ''),
            separator,
            center('STRUK PEMBAYARAN'),
            `No. Inv : ${transaction.invoiceNumber}`,
            `Pmbayar : ${payment.payerName || 'General'}`,
            `Tanggal : ${formatDate(payment.createdAt)}`,
            `Meja    : ${transaction.table?.tableName || 'N/A'}`,
            separator,
        ];

        // Items
        if (payment.itemsSnapshot && Array.isArray(payment.itemsSnapshot)) {
            const processedBundleIds = new Set<string>();

            payment.itemsSnapshot.forEach((item: any) => {
                if (item.bundleGroupId) {
                    if (processedBundleIds.has(item.bundleGroupId)) return;

                    const bundleItems = payment.itemsSnapshot.filter((i: any) => i.bundleGroupId === item.bundleGroupId);
                    const bundleName = bundleItems.find((i: any) => i.displayName?.includes('[PAKET]'))?.displayName || `Paket: Bundle`;
                    const bundleTotal = bundleItems.reduce((sum: number, i: any) => sum + Number(i.subtotal || 0), 0);

                    lines.push(bundleName.toUpperCase());
                    const qtyPrice = `1 x ${bundleTotal.toLocaleString()}`;
                    const subtotalStr = `Rp. ${bundleTotal.toLocaleString()}`;
                    const spaces = 32 - qtyPrice.length - subtotalStr.length;
                    lines.push(qtyPrice + ' '.repeat(Math.max(1, spaces)) + subtotalStr);

                    // List sub-items
                    bundleItems.forEach((bi: any) => {
                        const subName = bi.displayName || bi.name || 'Item';
                        lines.push(` - ${bi.qty}x ${subName}`);
                    });

                    processedBundleIds.add(item.bundleGroupId);
                } else {
                    lines.push(`${item.displayName || item.name || 'Item'}`);
                    const price = Number(item.price || 0);
                    const qty = Number(item.qty || 1);
                    const sub = Number(item.subtotal || (price * qty));

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
            { label: 'Subtotal', val: Number(payment.itemsSubtotal) + Number(payment.billiardPortion) },
            { label: 'Service', val: payment.serviceAmount },
            { label: 'PPN', val: payment.taxAmount },
            { label: 'Rounding', val: payment.roundingAmount },
        ];

        summary.forEach(s => {
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
}
