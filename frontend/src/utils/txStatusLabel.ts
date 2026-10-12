export type TxStatusKind = 'PAID' | 'MOVE' | 'CANCEL' | 'OTHER';

export interface TxStatusInfo {
    kind: TxStatusKind;
    label: string;
}

/**
 * Menentukan label status transaksi untuk laporan.
 * Transaksi berstatus CANCELLED sebenarnya ada dua jenis:
 *  - MOVE TABLE  : isi pesanan dipindah ke meja/transaksi lain (cafe → billiard, atau merge)
 *  - CANCEL ORDER: pesanan benar-benar dibatalkan
 */
export function getTxStatusInfo(tx: any): TxStatusInfo {
    const status = String(tx?.status || '').toUpperCase();
    if (status === 'PAID') return { kind: 'PAID', label: 'PAID' };
    if (status !== 'CANCELLED') return { kind: 'OTHER', label: status || '—' };

    const remarks = String(tx?.remarks || '').trim();
    const upper = remarks.toUpperCase();

    if (upper === 'MOVED CAFE TO BILLIARD TABLE') {
        return { kind: 'MOVE', label: 'MOVE TABLE · CAFE → BILLIARD' };
    }
    if (upper.startsWith('MERGED INTO')) {
        return { kind: 'MOVE', label: `MOVE TABLE · ${upper}` };
    }
    if (upper.startsWith('MOVE')) {
        return { kind: 'MOVE', label: `MOVE TABLE · ${upper}` };
    }

    // Data lama tanpa remarks: transaksi cafe yang batal dan tidak lagi memiliki item
    // berarti itemnya sudah dipindahkan ke transaksi lain (MOVE TABLE).
    const hasItems = Array.isArray(tx?.orderItems) && tx.orderItems.length > 0;
    if (!remarks && tx?.type === 'CAFE' && !hasItems && Number(tx?.grandTotal || 0) === 0) {
        return { kind: 'MOVE', label: 'MOVE TABLE · CAFE → BILLIARD' };
    }

    return { kind: 'CANCEL', label: 'CANCEL ORDER' };
}
